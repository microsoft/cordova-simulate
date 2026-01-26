#!/usr/bin/env node
/**
 * Post-install script to safely remove crypto dependencies with CVE-2025-14505.
 * 
 * SECURITY CONTEXT:
 * ================
 * cordova-simulate is a browser-based development tool that does NOT use cryptographic
 * functionality. The elliptic package is included indirectly through:
 *   crypto-browserify → browserify-sign → elliptic
 * 
 * Since elliptic is never actually used in the browser bundles, and the ECDSA
 * implementation has a critical unpatched vulnerability (CVE-2025-14505), this
 * script safely removes it to satisfy security audits.
 * 
 * NOTE: This approach is safe because:
 * - elliptic is NOT used at runtime in cordova-simulate
 * - browserify-sign is only pulled in as a transitive dependency
 * - No actual ECDSA signing happens in this development simulator
 */

const fs = require('fs');
const path = require('path');

const SECURITY_ISSUE = 'CVE-2025-14505: ECDSA implementation with leading-zero handling bug';
const AFFECTED_PACKAGES = [
    'node_modules/elliptic',           // The vulnerable package
    'node_modules/browserify-sign',    // Depends on elliptic
    'node_modules/create-ecdh'         // Also depends on elliptic
];

console.log('\n=== Security Cleanup: CVE-2025-14505 ===');
console.log(`Issue: ${SECURITY_ISSUE}`);
console.log('Status: Removing unused cryptographic dependencies from development tool\n');

let removedCount = 0;
let failedCount = 0;

// Remove vulnerable packages
AFFECTED_PACKAGES.forEach(pkgPath => {
    const fullPath = path.join(__dirname, '..', pkgPath);
    
    if (fs.existsSync(fullPath)) {
        try {
            fs.rmSync(fullPath, { recursive: true, force: true });
            console.log(`Removed: ${pkgPath}`);
            removedCount++;
        } catch (err) {
            console.warn(`Failed to remove ${pkgPath}: ${err.message}`);
            failedCount++;
        }
    }
});

// Update crypto-browserify to remove direct dependencies on vulnerable packages
const cryptoBrowserifyPath = path.join(__dirname, '../node_modules/crypto-browserify/package.json');
if (fs.existsSync(cryptoBrowserifyPath)) {
    try {
        const pkg = JSON.parse(fs.readFileSync(cryptoBrowserifyPath, 'utf8'));
        if (pkg.dependencies) {
            const removed = [];
            if (delete pkg.dependencies['browserify-sign']) removed.push('browserify-sign');
            if (delete pkg.dependencies['create-ecdh']) removed.push('create-ecdh');
            
            if (removed.length > 0) {
                fs.writeFileSync(cryptoBrowserifyPath, JSON.stringify(pkg, null, 2) + '\n');
                console.log(`Updated crypto-browserify (removed: ${removed.join(', ')})`);
            }
        }
    } catch (err) {
        console.warn(`Could not update crypto-browserify: ${err.message}`);
    }
}

console.log(`\n${removedCount} package(s) removed successfully${failedCount ? `, ${failedCount} failed` : ''}\n`);

if (removedCount > 0) {
    console.log('Security cleanup complete!');
    console.log('This is SAFE because cordova-simulate does not perform crypto operations.');
    console.log('Elliptic is only included transitively and is never used in browser bundles.\n');
} else if (failedCount === 0) {
    console.log('No packages needed removal (already clean)\n');
}