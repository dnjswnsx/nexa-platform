(function(){
 'use strict';
 var script=document.currentScript;if(!script)return;
 var agent=script.getAttribute('data-agent-id');if(!agent)return;
 var base=new URL(script.src).origin;var ko=script.getAttribute('data-locale')==='ko';
 var host=document.createElement('div');var shadow=host.attachShadow({mode:'open'});
 var style=document.createElement('style');style.textContent=':host{all:initial}button{position:fixed;bottom:22px;right:22px;background:#111827;color:#fff;border:1px solid #c8a96b;border-radius:30px;padding:16px 22px;font:600 14px system-ui;cursor:pointer;box-shadow:0 8px 25px #0003;z-index:2147483000}button:focus-visible{outline:3px solid #c8a96b;outline-offset:3px}iframe{position:fixed;bottom:85px;right:22px;width:390px;height:600px;max-width:calc(100vw - 32px);max-height:calc(100dvh - 110px);border:1px solid #e4e8ef;border-radius:16px;box-shadow:0 12px 45px #0003;background:white;z-index:2147483000}iframe[hidden]{display:none}';
 var button=document.createElement('button');button.textContent=ko?'문의하기':'Chat with us';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','nexa-frame');
 var frame=document.createElement('iframe');frame.id='nexa-frame';frame.title=ko?'NEXA 상담':'NEXA front desk';frame.hidden=true;frame.referrerPolicy='strict-origin';frame.src=base+'/widget?agent='+encodeURIComponent(agent)+'&locale='+(ko?'ko':'en')+'&host='+encodeURIComponent(location.origin);
 button.onclick=function(){frame.hidden=!frame.hidden;button.setAttribute('aria-expanded',String(!frame.hidden));button.textContent=frame.hidden?(ko?'문의하기':'Chat with us'):(ko?'닫기':'Close chat');if(!frame.hidden)frame.focus();};
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!frame.hidden){frame.hidden=true;button.setAttribute('aria-expanded','false');button.textContent=ko?'문의하기':'Chat with us';button.focus();}});
 shadow.append(style,frame,button);document.body.appendChild(host);
})();
