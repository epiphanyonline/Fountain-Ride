import { NextResponse } from 'next/server'
import { isAdminSession } from '../../../../lib/server/adminSession'
export async function GET(){return NextResponse.json({authenticated:await isAdminSession()})}
