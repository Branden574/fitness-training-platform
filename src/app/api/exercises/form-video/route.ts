import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      medium?: { url?: string };
      high?: { url?: string };
      default?: { url?: string };
    };
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        message:
          'Form video lookup is not configured. Set YOUTUBE_API_KEY in the environment to enable.',
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const name = (searchParams.get('name') ?? '').trim();
  if (!name) {
    return NextResponse.json({ message: 'name is required' }, { status: 400 });
  }

  const query = `${name} form tutorial`;
  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1` +
    `&videoEmbeddable=true&q=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { message: `YouTube error (${res.status})`, detail: text.slice(0, 300) },
        { status: 502 },
      );
    }
    const data = (await res.json()) as YouTubeSearchResponse;
    const item = data.items?.[0];
    const videoId = item?.id?.videoId;
    if (!item || !videoId) {
      return NextResponse.json(
        { message: 'No form video available for this exercise' },
        { status: 404 },
      );
    }
    const thumb =
      item.snippet?.thumbnails?.medium?.url ??
      item.snippet?.thumbnails?.high?.url ??
      item.snippet?.thumbnails?.default?.url ??
      '';

    return NextResponse.json({
      videoId,
      title: item.snippet?.title ?? '',
      channelTitle: item.snippet?.channelTitle ?? '',
      thumbnailUrl: thumb,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
    });
  } catch (error) {
    console.error('YouTube form-video error:', error);
    return NextResponse.json(
      { message: 'Failed to look up form video' },
      { status: 502 },
    );
  }
}
