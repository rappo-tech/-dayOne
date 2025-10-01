import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
export async function middleware(req:NextRequest) {
try{
const token=req.cookies.get('custom-token')?.value||
req.headers.get('Authorization')?.replace("Bearer",'')

if(!token){
  if(req.nextUrl.pathname.startsWith('/api/')){
return NextResponse.json({error:'un-verified'},{status:404})
}

return NextResponse.redirect( new URL('/login',req.url))
}

const {payload}=await jwtVerify(token ,
new TextEncoder().encode(process.env.JWT_SECRET)
)
console.log(`token verified for this user ${payload.email}`)
return  NextResponse.next()
}catch(error){
const jwterror=error as {code?:string,message?:string}
if(jwterror.code==='ERR_ JWT_EXPIRED'){
const response=await NextResponse.redirect(new URL('/login',req.url))
response.cookies.delete('custom-token')
return response
}

if(req.nextUrl.pathname.startsWith('/api/')){
return NextResponse.json({error:'un-verified'},{status:404})
}

return NextResponse.redirect( new URL('/login',req.url))
}
}



export const config = {
  matcher: [
    "/vdo/:path*",
  ],
};