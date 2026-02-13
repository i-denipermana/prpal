#!/usr/bin/env node
/**
 * Generate placeholder tray icons for macOS menu bar
 * Run: node scripts/generate-icons.js
 * 
 * For production, replace with proper designed icons.
 * macOS template icons should be black/transparent PNG files.
 */

import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const assetsDir = join(__dirname, '../assets')

// Simple 16x16 PR icon (black silhouette for macOS template)
// This is a minimal placeholder - replace with designed icon
const icon16Base64 = 
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA' +
  'gElEQVQ4T2NkoBAwUqifYdAYwPD//38GJSUl/D5++PAhg4GB' +
  'AQMjIyMYMzAwgNWC5EFiIHEQG8QGqYexYXJwNpINNADZBSA2' +
  'SAzERhYHy4HUgNggOWQ2SI0hAwPDfxAbJIfMBqkhyAbQeSA2' +
  'SA6ZDVJDyABkF8DYIDlkNkgNIQMAAAD//wMAX2Aa7QAAAABJ' +
  'RU5ErkJggg=='

// 32x32 version for @2x retina
const icon32Base64 =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA' +
  'vElEQVRYR2NkGGDAOMAANGDQGMDw//9/BiUlJfz++fDhQwYD' +
  'AwMGRkZGMGZgYACrBcmDxEDiIDaIDVIPY8Pk4GwkG2gAsgNA' +
  'bJAYiI0sDpYDqQGxQXLIbJAaQwaA+AxkAIgNkkNmg9QQMgDZ' +
  'BWAxkBwyG6SGkAEguQDEBskhs0FqCBmA7AIwGyQHYoPkkNkg' +
  'NYQMQHYBTAzEBskhs0FqCBmA7AKwGpAcMhukhtgGgPgMZACI' +
  'DZJDZoPUEDIAAL+5GjC/pnOPAAAAAElFTkSuQmCC'

function writeIcon(filename, base64Data) {
  const buffer = Buffer.from(base64Data, 'base64')
  const path = join(assetsDir, filename)
  writeFileSync(path, buffer)
  console.log(`Created: ${path}`)
}

writeIcon('iconTemplate.png', icon16Base64)
writeIcon('iconTemplate@2x.png', icon32Base64)

console.log('\nPlaceholder icons created.')
console.log('For production, replace with properly designed icons.')
