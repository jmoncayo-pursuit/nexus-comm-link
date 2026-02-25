# Security Policy

This document outlines the security measures, vulnerability reporting procedures, and the underlying security architecture of the Nexus Comm-Link.

## Security Overview

Nexus Comm-Link is designed as a secure gateway for remote monitoring of development sessions. It prioritizes local network security while providing optional, authenticated tunnels for global access.

## Reporting a Vulnerability

If you identify a security vulnerability within this project, please report it responsibly.

1.  **Do Not Open a Public Issue**: To prevent exploitation, please avoid discussing vulnerabilities in the public issue tracker.
2.  **Contact**: Send a detailed report to the maintainer [Insert Contact Information].
3.  **Response Timeline**: You can expect an initial acknowledgement within 48 hours and a full assessment/remediation plan within 7 days.

## Supported Versions

Security updates are provided for the following versions:

| Version | Status |
| --- | --- |
| 2.1.x | Managed / Active |
| < 2.1.0 | End of Life |

## Security Architecture

### 1. Transport Layer Security (TLS)
The server supports and recommends the use of HTTPS (TLS 1.2/1.3). When certificates are detected in the `certs/` directory, the server automatically initializes in secure mode.
- **Certificate Support**: The system supports self-signed certificates for local network testing.
- **Auto-Detection**: The server checks for `server.key` and `server.cert` during the boot sequence.

### 2. Authentication Model
The system employs a multi-tiered authentication strategy:
- **LAN Exemption**: By default, requests originating from the local network (192.168.x.x, 10.x.x.x, etc.) are trusted to provide a seamless development experience within a private workspace.
- **Global Auth**: Requests arriving via external tunnels or public IPs require a signed session cookie.
- **Session Tokens**: Authentication is managed via `httpOnly`, signed cookies to prevent client-side script access (XSS mitigation).

### 3. Tunneling Security
When using the remote access mode (`start_nexus_connect_web.sh`), the system utilizes a secure tunnel.
- **One-Time Passcodes**: If a persistent `APP_PASSWORD` is not configured, the system generates a unique, temporary 6-digit passcode for the session.
- **Encapsulated Management**: The tunnel and the server are managed as a single lifecycle unit to ensure no orphaned ports remain open after a session ends.

### 4. Data Protection
- **Snapshot Isolation**: DOM snapshots are processed server-side to remove sensitive or unnecessary metadata before transmission to mobile clients.
- **Input Sanitization**: All commands sent from the mobile interface are strictly sanitized and escaped before injection into the desktop environment via the Chrome DevTools Protocol (CDP).

## Handling Browser Security Warnings

When using self-signed certificates, browsers will notify you that the connection is "not private." This is due to the lack of a third-party Certificate Authority (CA).

### Verification
You can verify that your connection is encrypted despite the warning:
1. Click the "Not Secure" or "Warning" icon in the address bar.
2. View the certificate details.
3. Confirm the "Subject" matches your local machine's IP address.

### Bypassing Warnings for Local Development
- **Chrome/Android**: Advanced > Proceed to [IP Address] (unsafe).
- **Safari/iOS**: Show Details > Visit this website > Confirm.

## Best Practices
- **Rotate Passwords**: Change your `APP_PASSWORD` regularly if using persistent remote access.
- **Restrict Physical Access**: Ensure your desktop and mobile devices are locked when unattended.
- **Environment Isolation**: Do not run the Nexus Comm-Link on untrusted or public Wi-Fi networks without an active VPN.
