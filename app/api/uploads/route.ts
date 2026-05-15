import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateFiles } from '@/lib/uploads/validation';

export const runtime = 'nodejs';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'pet-uploads';

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: userData, error: userError } = await getSupabaseAdmin().auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
    }

    const formData = await req.formData();
    const incoming = formData.getAll('files');
    const files = incoming.filter((file): file is File => file instanceof File);

    const validation = validateFiles(files);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const uploads: Array<{
      storage_path: string;
      original_name: string;
      mime_type: string;
      size_bytes: number;
      user_id: string;
    }> = [];

    for (const file of files) {
      const safeName = sanitizeFilename(file.name || 'upload');
      const filePath = `uploads/${userData.user.id}/${crypto.randomUUID()}-${safeName}`;
      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await getSupabaseAdmin().storage
        .from(BUCKET)
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      uploads.push({
        storage_path: filePath,
        original_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        user_id: userData.user.id,
      });
    }

    const { data: inserted, error: insertError } = await getSupabaseAdmin()
      .from('pet_uploads')
      .insert(uploads)
      .select('id, storage_path, original_name');

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ uploads: inserted ?? [] }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
