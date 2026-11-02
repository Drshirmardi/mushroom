async (page) => {
 const publication='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
 const assert=(value,message)=>{if(!value)throw new Error(message);};
 const definition={version:1,purpose:'MARRIAGE',roles:[{id:'FIRST',title:'آقا',genders:['MALE'],minimumAgeYears:18},{id:'SECOND',title:'خانم',genders:['FEMALE'],minimumAgeYears:18}],genericJointText:'تفسیر عمومی'};
 const settings={publicationId:publication,title:'شناخت پیش از ازدواج',amountRial:'100000',definition,eligibleRoles:['FIRST'],linkingPolicy:{id:publication,title:'اتصال حساب‌ها',body:'شرایط اتصال برای همین خدمت',contentHash:'a'.repeat(64),versionNumber:1,policyKey:'COUPLES_ACCOUNT_LINKING',locale:'fa-IR'}};

 let reads=0,reviews=0,status='PENDING',limited=false;
 const row=()=>({id,status,isInitiator:false,ownEligible:true,ownRole:'SECOND',service:settings,invitationPath:`/assessment/marriage/requests/${id}`,smsStatus:null});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();
 await page.route('**/v1/**',async route=>{
  const req=route.request(),p=new URL(req.url()).pathname;
  const headers={'access-control-allow-origin':req.headers().origin||'*','access-control-allow-credentials':'true'};
  const send=(data,status=200,extra={})=>route.fulfill({status,headers:{...headers,...extra},contentType:'application/json',body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type'}});
  if(p==='/v1/auth/refresh')return send({accessToken:'test',expiresIn:600,user:{id:publication,roles:['PATIENT']}});
  if(p==='/v1/patients/me/entry')return send({required:false});
  if(p.endsWith('/review')){reviews++;return send(row());}
  if(p.endsWith('/accept')){status='ACCEPTED';return send(row());}
  if(p.endsWith(id)){reads++;return limited?send({code:'RATE_LIMITED'},429,{'retry-after':'90'}):send(row());}
  return send({});
 });
 await page.goto(`http://127.0.0.1:3017/assessment/marriage/requests/${id}`);
 await page.getByRole('heading',{name:'پذیرش نقش و دعوت'}).waitFor();
 await page.getByRole('checkbox').check();
 const stable=reads;
 await page.clock.fastForward(31000);
 await page.getByRole('heading',{name:'پذیرش نقش و دعوت'}).waitFor();
 assert(await page.getByRole('checkbox').isChecked(),'consent lost');
 assert(reviews===1,'review repeated');assert(reads<=stable+1,'GET storm');
 limited=true;await page.clock.fastForward(31000);
 await page.getByRole('alert').waitFor();const blocked=reads;
 await page.clock.fastForward(60000);assert(reads===blocked,'cooldown ignored');
 limited=false;await page.clock.fastForward(31000);
 await page.getByRole('button',{name:'پذیرش دعوت و ادامه',exact:true}).click();
 await page.getByRole('heading',{name:'همراهی تأیید شد'}).waitFor();
 const done=reads;await page.clock.fastForward(90000);assert(reads===done,'terminal polling');
 assert(errors.length===0,JSON.stringify(errors));
 console.log(JSON.stringify({PASS:true,reads,reviews,consentPreserved:true,cooldown:true,terminalStopped:true}));
}