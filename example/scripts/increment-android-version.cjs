#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const buildGradlePath = path.join(__dirname, '../android/app/build.gradle');
const buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

const versionCodeMatch = buildGradle.match(/versionCode\s+(\d+)/);
const versionNameMatch = buildGradle.match(/versionName\s+"([^"]+)"/);

if (!versionCodeMatch || !versionNameMatch) {
  console.error('Could not find versionCode/versionName in android/app/build.gradle');
  process.exit(1);
}

const currentVersionCode = Number(versionCodeMatch[1]);
const currentVersionName = versionNameMatch[1];

if (!Number.isFinite(currentVersionCode)) {
  console.error(`Invalid versionCode: ${versionCodeMatch[1]}`);
  process.exit(1);
}

const versionParts = currentVersionName.split('.');
const lastPart = versionParts[versionParts.length - 1];
const lastNumber = Number(lastPart);

if (!Number.isFinite(lastNumber)) {
  console.error(`Could not increment versionName: ${currentVersionName}`);
  process.exit(1);
}

const nextVersionCode = currentVersionCode + 1;
const nextLastNumber = String(lastNumber + 1).padStart(lastPart.length, '0');
const nextVersionName = [...versionParts.slice(0, -1), nextLastNumber].join('.');

const nextBuildGradle = buildGradle
  .replace(/versionCode\s+\d+/, `versionCode ${nextVersionCode}`)
  .replace(/versionName\s+"[^"]+"/, `versionName "${nextVersionName}"`);

fs.writeFileSync(buildGradlePath, nextBuildGradle, 'utf8');

console.log(
  `Android version bumped: ${currentVersionName} (${currentVersionCode}) -> ${nextVersionName} (${nextVersionCode})`,
);
