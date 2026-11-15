import { createSchema,requestSchema,manageSchema,gateSchema } from './validation.ts';
function assert(value:boolean){if(!value)throw new Error('Assertion failed');}
const valid={action:'create',drug_name:'אוביטרל',dose:'0.25',quantity:'3 מזרקים',expiry_month:'2099-12',sealed:true,opened_on:'',opened_note:'',refrigerated:'unsure',area:'ירושלים והסביבה',city:'ירושלים',volunteer_transfer:false,nickname:'TEST_FORM',contact_mode:'mediator',phone:'0500000099',name:'TEST_PRIVATE',email:'',declaration:true};
Deno.test('server accepts anonymous valid input',()=>assert(createSchema.safeParse(valid).success));
Deno.test('server rejects past expiry',()=>assert(!createSchema.safeParse({...valid,expiry_month:'2000-01'}).success));
Deno.test('server enforces 20 character nickname',()=>assert(!createSchema.safeParse({...valid,nickname:'א'.repeat(21)}).success));
Deno.test('server rejects public contact details',()=>{assert(!createSchema.safeParse({...valid,nickname:'0500000099'}).success);assert(!createSchema.safeParse({...valid,city:'רחוב הרצל 5'}).success);assert(!createSchema.safeParse({...valid,dose:'x@example.com'}).success);});
Deno.test('server strips HTML and rejects links',()=>{assert(createSchema.parse({...valid,quantity:'<b>3</b>'}).quantity==='3');assert(!createSchema.safeParse({...valid,opened_note:'https://example.com'}).success);});
Deno.test('server requires phone in both contact modes',()=>{for(const contact_mode of ['direct','mediator'])assert(!createSchema.safeParse({...valid,contact_mode,phone:''}).success);});
Deno.test('server requires declaration',()=>assert(!createSchema.safeParse({...valid,declaration:false}).success));
Deno.test('request requires phone',()=>assert(!requestSchema.safeParse({action:'request',listing_id:'00000000-0000-4000-8000-000000000001',phone:'',name:'',note:''}).success));
Deno.test('honeypot must be empty',()=>assert(!gateSchema.safeParse({challenge:'x',website:'bot'}).success));
Deno.test('manage requires 256-bit token and close status',()=>{assert(!manageSchema.safeParse({action:'manage',token:'short',status:'removed'}).success);assert(!manageSchema.safeParse({action:'manage',token:'a'.repeat(64),status:'available'}).success);});
