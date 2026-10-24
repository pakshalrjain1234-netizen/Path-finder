// ==============================================================================
// Supabase Edge Function: submit-feedback
// Purpose: Secure public endpoint for anonymous visitor feedback.
// Enforces persistent PostgreSQL-based atomic rate limiting per hashed client ID.
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const ALLOWED_CATEGORIES = [
  'Campus 3D experience',
  'Navigation experience',
  'Campus information',
  'Website usability',
  'General suggestion',
] as const

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Compute privacy-preserving client hash using server salt
async function getClientHash(req: Request): Promise<string> {
  const clientIp =
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'anonymous-visitor'

  const salt = Deno.env.get('FEEDBACK_SALT') || 'mnmjec_pathfinder_2026_salt'
  const data = new TextEncoder().encode(`${clientIp}::${salt}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Enforce body payload size limit (max 10KB to prevent memory exhaustion)
    const contentLength = Number(req.headers.get('content-length') || 0)
    if (contentLength > 10240) {
      return new Response(
        JSON.stringify({ error: 'Payload too large. Maximum size is 10 KB.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { rating, category, name, comments } = body

    // 1. Strict Rating Validation
    const parsedRating = Number(rating)
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return new Response(
        JSON.stringify({ error: 'Rating must be an integer between 1 and 5.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Strict Category Validation
    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
      return new Response(
        JSON.stringify({ error: 'Invalid feedback category.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Strict Text Sanitization & Bounds
    const cleanName = typeof name === 'string' ? name.trim().slice(0, 100) : undefined
    const cleanComments = typeof comments === 'string' ? comments.trim().slice(0, 2000) : undefined

    // 4. Client Hash for Database Atomic Rate Limiting
    const clientHash = await getClientHash(req)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 5. Call PostgreSQL Atomic Submission RPC
    const { data, error } = await supabaseAdmin.rpc('submit_visitor_feedback', {
      p_rating: parsedRating,
      p_category: category,
      p_name: cleanName || null,
      p_comments: cleanComments || null,
      p_client_ip_hash: clientHash,
    })

    if (error) {
      // Check for rate limit error message from PostgreSQL
      if (error.message?.includes('Rate limit exceeded')) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded: You have submitted multiple responses. Please wait 10 minutes.',
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.error('Database RPC error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to record feedback. Please try again later.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: data.id,
        message: 'Thank you! Your feedback has been safely recorded.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('Edge function unexpected exception:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error processing feedback.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
