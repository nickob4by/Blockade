import { NextResponse } from 'next/server';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase/client';
import { normalizeAuthEmail } from '@/lib/auth/utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, displayName, emoji } = body;

    const cleanUsername = (username || '').trim();
    const cleanPassword = (password || '').trim();
    const cleanDisplayName = (displayName || cleanUsername || 'Player').trim();
    const cleanEmoji = (emoji || '').trim() || undefined;

    if (!cleanUsername || cleanUsername.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters long.' },
        { status: 400 }
      );
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const email = normalizeAuthEmail(cleanUsername);
    const admin = getSupabaseAdminClient();

    if (admin) {
      // Create user with email_confirm: true so no confirmation email is required
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          display_name: cleanDisplayName,
          name: cleanDisplayName,
          username: cleanUsername,
          emoji: cleanEmoji,
        },
      });

      if (error) {
        console.error('Registration API Error:', error);
        const msg = error.message.toLowerCase();
        if (msg.includes('already') || msg.includes('exists') || msg.includes('duplicate')) {
          return NextResponse.json(
            { error: 'This username is already taken. Please choose another or sign in.' },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        user: data.user,
        email,
      });
    }

    // Fallback to standard client signUp
    const client = getSupabaseClient();
    if (!client) {
      return NextResponse.json(
        { error: 'Database service is not configured.' },
        { status: 500 }
      );
    }

    const { data, error } = await client.auth.signUp({
      email,
      password: cleanPassword,
      options: {
        data: {
          display_name: cleanDisplayName,
          name: cleanDisplayName,
          username: cleanUsername,
          emoji: cleanEmoji,
        },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already') || msg.includes('exists') || msg.includes('duplicate')) {
        return NextResponse.json(
          { error: 'This username is already taken. Please choose another or sign in.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      email,
    });

  } catch (err: any) {
    console.error('Registration Unexpected Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to create account.' },
      { status: 500 }
    );
  }
}
