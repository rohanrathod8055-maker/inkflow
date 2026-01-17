import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) return new NextResponse('No URL', { status: 400 });

    try {
        // Resolve path to the python script
        // Assuming quick_scrape.py is in the project root
        const scriptPath = path.resolve(process.cwd(), 'quick_scrape.py');

        // Execute Python script
        // NOTE: 'python' command must be in system PATH and have playwright installed
        const { stdout, stderr } = await execAsync(`python "${scriptPath}" "${targetUrl}"`, {
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });

        if (stderr) {
            console.warn("Scraper Stderr:", stderr);
            // We don't return error immediately as stderr might contain non-fatal warnings
            // unless stdout is empty
        }

        if (!stdout) {
            throw new Error("No output from scraper");
        }

        return new NextResponse(stdout, {
            headers: {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-store, max-age=0',
            },
        });

    } catch (e: any) {
        console.error("Scrape Route Error:", e);
        const errorMessage = e.stderr ? `Scrape Failed (Stderr): ${e.stderr}` : `Scrape Failed: ${e.message}`;
        return new NextResponse(errorMessage, { status: 500 });
    }
}
