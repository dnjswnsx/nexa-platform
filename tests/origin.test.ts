import {afterEach,it,expect,vi} from 'vitest';
import {appOrigins,isAppOrigin} from '../src/origin';
afterEach(()=>vi.unstubAllEnvs());
function render(){vi.stubEnv('APP_URL','');vi.stubEnv('RENDER_EXTERNAL_URL','https://nexa-preview.onrender.com');}
it('accepts the Render HTTPS origin when Next sees an internal HTTP URL',()=>{render();expect(isAppOrigin('https://nexa-preview.onrender.com','http://localhost:10000/api/auth/register')).toBe(true);});
it('does not require an APP_URL override for Render or widget sessions',()=>{render();expect(appOrigins('http://localhost:10000')).toEqual(['https://nexa-preview.onrender.com']);});
it('accepts the provider origin alongside an explicit custom domain or stale local setting',()=>{render();vi.stubEnv('APP_URL','http://localhost:3000');expect(isAppOrigin('https://nexa-preview.onrender.com','http://localhost:10000')).toBe(true);vi.stubEnv('APP_URL','https://academy.example');expect(isAppOrigin('https://academy.example','http://localhost:10000')).toBe(true);});
it('rejects attacker origins, lookalike domains and absent or opaque origins',()=>{render();for(const origin of ['https://evil.example','https://nexa-preview.onrender.com.evil.example',null,'null'])expect(isAppOrigin(origin,'http://localhost:10000')).toBe(false);});
it('preserves local-development same-origin behavior',()=>{vi.stubEnv('APP_URL','');vi.stubEnv('RENDER_EXTERNAL_URL','');expect(isAppOrigin('http://localhost:3000','http://localhost:3000/api/auth/register')).toBe(true);expect(isAppOrigin('http://localhost:3001','http://localhost:3000')).toBe(false);});
it('normalizes trusted server configuration without accepting arbitrary request origins',()=>{render();vi.stubEnv('RENDER_EXTERNAL_URL',' https://nexa-preview.onrender.com/ ');expect(isAppOrigin('https://nexa-preview.onrender.com','http://localhost:10000')).toBe(true);expect(isAppOrigin('http://localhost:10000','http://localhost:10000')).toBe(false);});
