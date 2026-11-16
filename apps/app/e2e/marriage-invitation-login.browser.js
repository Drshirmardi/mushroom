async page => {
 const destination='http://localhost:3001/assessment/marriage/requests/11111111-1111-4111-8111-111111111111';
 let sends=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/v1/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,headers={'access-control-allow-origin':req.headers().origin||'*','access-control-allow-credentials':'true'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,idempotency-key'}});
  let data={};let status=200;
  if(path==='/v1/auth/refresh'){status=401;data={code:'UNAUTHORIZED'};}
  if(path.endsWith('/challenges')){sends++;data={challengeId:'11111111-1111-4111-8111-111111111111',expiresAt:new Date(Date.now()+300000).toISOString(),resendAvailableAt:new Date(Date.now()+60000).toISOString()};}
  if(path.endsWith('/verify'))data={user:{roles:['PATIENT']}};
  return route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.route('http://localhost:3001/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Invitation destination retained</h1>'}));
 await page.setViewportSize({width:375,height:812});
 await page.goto('http://127.0.0.1:3018/fa/login?next='+encodeURIComponent(destination));
 await page.getByText('برای مشاهده و ادامه دعوت، با شماره دریافت‌کننده وارد شوید.',{exact:false}).waitFor();
 await page.locator('input[type=tel]').waitFor();
 await page.locator('input[type=tel]').fill('09123456789');
 const submit = page.getByRole('button',{name:'دریافت کد ورود',exact:true});
 const background = await submit.evaluate(el=>getComputedStyle(el).backgroundColor);
 if (background==='rgba(0, 0, 0, 0)' || background==='transparent') throw new Error('invisible primary action');
 await submit.click();
 await page.locator('input[autocomplete=one-time-code]').fill('123456');
 await page.waitForURL(destination);
 if(sends!==1||errors.length)throw new Error(JSON.stringify({sends,errors}));
 return {PASS:true,otpRequests:sends,destination};
}
