import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    console.log('Processing receipt OCR for user:', user.id);

    // Convert file to base64 for AI
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = file.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Use Lovable AI for OCR
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em extrair dados de comprovantes financeiros. Extraia as seguintes informações: valor, data, descrição/estabelecimento, forma de pagamento. Retorne APENAS um objeto JSON válido sem markdown.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extraia as informações deste comprovante/nota fiscal. Retorne no formato: {"valor": number, "data": "YYYY-MM-DD", "descricao": "string", "forma_pagamento": "string"}. Se não encontrar um campo, use null.'
              },
              {
                type: 'image_url',
                image_url: { url: dataUrl }
              }
            ]
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('Failed to process image with AI');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('AI response:', content);

    // Parse the JSON response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      extractedData = JSON.parse(cleanContent);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse OCR results');
    }

    // Upload file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('receipts')
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error('Failed to upload file');
    }

    // Create document record
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        file_name: file.name,
        storage_path: fileName,
        file_type: file.type,
        file_size: file.size,
        is_encrypted: false
      })
      .select()
      .single();

    if (docError) {
      console.error('Document insert error:', docError);
      throw new Error('Failed to create document record');
    }

    return new Response(
      JSON.stringify({
        success: true,
        document_id: docData.id,
        extracted: extractedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('OCR error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
