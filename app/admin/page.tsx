"use client";
import { useRouter } from "next/navigation";
import { LoginScreen } from "@/components/login-screen";
export default function AdminAccess(){const router=useRouter();return <LoginScreen defaultOpen onLogin={()=>router.replace("/log")}/>;}
