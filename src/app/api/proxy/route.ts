import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) return new NextResponse('No URL', { status: 400 });

    try {
        // 15s Timeout for Source Fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
                'Referer': 'https://asuracomic.net/',
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        // Pass upstream status and body
        return new NextResponse(response.body, {
            status: response.status,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
                'Access-Control-Allow-Headers': 'Content-Type, Referer, User-Agent',
                'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (e: any) {
        // Return 500 with error message
        return new NextResponse(`Proxy Error: ${e.message}`, {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
            'Access-Control-Allow-Headers': 'Content-Type, Referer, User-Agent',
        },
    });
}