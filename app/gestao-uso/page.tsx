import type { Metadata } from "next";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Registro de uso",robots:{index:false,follow:false}};
export { default } from "../log/page";
