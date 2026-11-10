/**
 * @file dev-server.js
 * @description 외부 라이브러리(Express 등) 없이 순수 Node.js 내장 모듈만으로 구동되는 로컬 개발 서버
 * Vercel 계정 로그인 없이도 로컬(localhost:3000)에서 정적 파일 및 api/*.js 서버리스 함수를 즉시 테스트할 수 있습니다.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. .env.local 파일 환경 변수 로드
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=');
      if (key && values.length > 0) {
        process.env[key.trim()] = values.join('=').trim();
      }
    }
  });
  console.log('[DevServer] .env.local 환경 변수가 성공적으로 로드되었습니다.');
} else {
  console.warn('[DevServer] .env.local 파일이 없습니다. 기본 환경 변수를 사용합니다.');
}

const PORT = process.env.PORT || 3000;

// MIME 타입 매핑
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// 2. HTTP 서버 생성
const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0];

  // 2.1 Vercel 서버리스 함수 라우팅 (/api/*)
  if (urlPath.startsWith('/api/')) {
    const functionName = urlPath.replace('/api/', '').replace(/\/$/, '');
    const apiFilePath = path.join(__dirname, 'api', `${functionName}.js`);

    if (fs.existsSync(apiFilePath)) {
      try {
        // 캐시 삭제 후 최신 코드 로드 (핫 리로드 지원)
        delete require.cache[require.resolve(apiFilePath)];
        const handler = require(apiFilePath);

        // 요청 바디(Body) 버퍼 파싱
        let bodyBuffer = '';
        req.on('data', chunk => {
          bodyBuffer += chunk;
        });

        req.on('end', async () => {
          if (bodyBuffer) {
            try {
              req.body = JSON.parse(bodyBuffer);
            } catch (e) {
              req.body = bodyBuffer;
            }
          } else {
            req.body = {};
          }

          // Vercel 서버리스 호환 res.status().json() 헬퍼 추가
          res.status = function (statusCode) {
            this.statusCode = statusCode;
            return this;
          };
          res.json = function (data) {
            this.setHeader('Content-Type', 'application/json; charset=utf-8');
            this.end(JSON.stringify(data));
          };

          try {
            await handler(req, res);
          } catch (handlerErr) {
            console.error('[DevServer] 핸들러 실행 에러:', handlerErr);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: handlerErr.message }));
            }
          }
        });
        return;
      } catch (err) {
        console.error('[DevServer] 모듈 로드 에러:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.end(JSON.stringify({ error: err.message }));
      }
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: `API 엔드포인트를 찾을 수 없습니다: ${urlPath}` }));
    }
  }

  // 2.2 정적 파일 서빙 (HTML, CSS, JS)
  let filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('404 Not Found');
      } else {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(`500 Server Error: ${err.code}`);
      }
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      res.end(content);
    }
  });
});

// 3. 서버 시작
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🍳 [냉장고 파먹기 AI] 로컬 개발 서버가 시작되었습니다!`);
  console.log(`👉 접속 주소: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
