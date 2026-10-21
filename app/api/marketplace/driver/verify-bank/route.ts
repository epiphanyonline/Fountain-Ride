import {NextResponse} from 'next/server'
import {getDriverForToken,driverToken,driverApplicationId} from '../../../../../lib/server/marketplaceAuth'

export async function POST(req:Request){
 const driver=await getDriverForToken(driverApplicationId(req),driverToken(req));
 if(!driver)return NextResponse.json({error:'Unauthorized'},{status:401})
 const body=await req.json().catch(()=>null),bankCode=String(body?.bankCode||'').trim(),accountNumber=String(body?.accountNumber||'').replace(/\D/g,'')
 if(!bankCode||accountNumber.length!==10)return NextResponse.json({error:'Select a bank and enter a valid 10-digit account number.'},{status:400})
 const secret=process.env.PAYSTACK_SECRET_KEY
 if(!secret)return NextResponse.json({error:'Paystack is not configured.'},{status:503})
 try{
  const url=`https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
  const r=await fetch(url,{headers:{Authorization:`Bearer ${secret}`},cache:'no-store'})
  const d=await r.json()
  if(!r.ok||!d?.status||!d?.data?.account_name)return NextResponse.json({error:d?.message||'We could not verify that account.'},{status:400})
  return NextResponse.json({verified:true,accountName:String(d.data.account_name),accountNumber:String(d.data.account_number||accountNumber)})
 }catch{return NextResponse.json({error:'Unable to verify the bank account right now.'},{status:502})}
}
