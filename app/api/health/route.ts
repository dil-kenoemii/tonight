import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Railway
 * Returns a simple status message
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
