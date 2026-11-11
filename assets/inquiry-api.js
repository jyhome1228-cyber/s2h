/*
S2H inquiry API configuration
The GitHub Pages site has no server of its own.
Deploy a secured API separately, then set baseUrl below.
Do not store secrets or admin credentials in this public file.
Expected public endpoint: POST {baseUrl}/inquiries
Payload: {kind,fields,source,createdAt}
Response: 2xx with {id,ok:true}
The API must enforce rate limits, validation, CORS origin restrictions and spam protection.
Expected admin endpoints require server-side authentication and authorization.
*/
window.S2H_API_CONFIG=Object.freeze({
  baseUrl:"",
  enabled:false
});
window.S2HInquiryAPI={
  isConfigured(){const c=window.S2H_API_CONFIG;return Boolean(c&&c.enabled&&/^https:\/\//.test(c.baseUrl))},
  async adminList(kind){
    if(!this.isConfigured())return {configured:false};
    // The server MUST enforce an authenticated admin session and role checks.
    const url=window.S2H_API_CONFIG.baseUrl.replace(/\/$/,"")+"/admin/inquiries?kind="+encodeURIComponent(kind);
    const response=await fetch(url,{method:"GET",mode:"cors",credentials:"include",headers:{"Accept":"application/json"}});
    if(!response.ok)throw new Error("Admin authorization or API error: "+response.status);
    const data=await response.json();
    if(!data||!Array.isArray(data.items))throw new Error("Invalid admin response");
    return {configured:true,items:data.items};
  },
  async submit(kind,fields){
    if(!this.isConfigured())return {configured:false};
    const url=window.S2H_API_CONFIG.baseUrl.replace(/\/$/,"")+"/inquiries";
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(url,{method:"POST",mode:"cors",credentials:"omit",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind,fields,source:location.pathname,createdAt:new Date().toISOString()}),signal:controller.signal});
      if(!response.ok)throw new Error("HTTP "+response.status);
      const payload=await response.json();
      if(!payload||payload.ok!==true||!payload.id)throw new Error("Invalid acknowledgement");
      return {configured:true,success:true,id:payload.id};
    }finally{clearTimeout(timer)}
  }
};