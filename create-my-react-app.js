#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 프로젝트 이름 가져오기
const projectName = process.argv[2];

if (!projectName) {
  console.log('사용법: npx create-my-react-app <project-name>');
  process.exit(1);
}

console.log(`🚀 ${projectName} 프로젝트를 생성 중...`);

try {
  // 템플릿 클론
  execSync(`npx degit kingcat47/React_default-template ${projectName}`, { stdio: 'inherit' });
  
  // 프로젝트 디렉토리로 이동
  process.chdir(projectName);
  
  // package.json 업데이트
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  packageJson.name = projectName;
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  
  // 의존성 설치
  console.log('📦 의존성 설치 중...');
  execSync('npm install', { stdio: 'inherit' });
  
  // Git 초기화
  execSync('git init', { stdio: 'inherit' });
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "Initial commit from template"', { stdio: 'inherit' });
  
  console.log(`✅ ${projectName} 프로젝트가 생성되었습니다!`);
  console.log(`cd ${projectName} && npm run dev`);
  
} catch (error) {
  console.error('❌ 프로젝트 생성 실패:', error.message);
  process.exit(1);
}
