# Secure Messaging Backend

A robust and secure messaging backend built with Node.js, Express, and ES6+ syntax. This project implements encrypted message storage and retrieval using AES-256-GCM, ensuring confidentiality and integrity. Features include user-specific message encryption, secure key derivation, message expiry, and a debug endpoint for decryption testing.

## Table of Contents
- [Features](#features)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Running the Project](#running-the-project)
- [Testing with Postman](#testing-with-postman)
- [Design Decisions](#design-decisions)
- [Assumptions](#assumptions)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Features
- **Encrypted Messaging**: Store and retrieve messages encrypted with AES-256-GCM.
- **User Isolation**: Messages are accessible only to the original user via user-specific keys.
- **Message Expiry**: Messages auto-delete after 10 minutes (bonus feature).
- **Debug Endpoint**: Test decryption with a dedicated endpoint.
- **Secure Key Derivation**: Uses HKDF to generate unique keys per user.
- **Error Handling**: Meaningful responses for invalid inputs and failures.

## Project Structure
```
secure-messaging-backend/
├── src/
│   ├── crypto.js           # Encryption and decryption logic
│   ├── db.js              # In-memory database with expiry
│   ├── server.js          # Express server with API endpoints
│   ├── debug_code.js      # Original broken decryption function
│   └── debug_fixed.js     # Fixed decryption with test cases
├── package.json            # Project dependencies and scripts
├── .env                    # Environment variables
└── README.md               # Project documentation
```

## Setup Instructions

### Prerequisites
- **Node.js**: v18 or higher ([download](https://nodejs.org/))
- **npm**: Included with Node.js
- **Postman**: Optional, for API testing ([download](https://www.postman.com/downloads/))

### Installation
1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd secure-messaging-backend
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   - Create a `.env` file in the project root:
     ```env
     SERVER_SECRET=your-32-byte-secret
     PORT=3000
     ```
   - Generate a secure secret:
     ```bash
     openssl rand -hex 32
     ```
   - Use the output as `SERVER_SECRET`.

## Running the Project
1. **Start the Server**:
   ```bash
   npm start
   ```
   - The server runs on `http://localhost:3000` (or the port specified in `.env`).

2. **Verify**:
   - Open `http://localhost:3000` in a browser (returns 404, confirming the server is up).
   - Proceed to test endpoints with Postman or curl.

## Testing with Postman

### Setup
- Create a new Postman collection: "Secure Messaging Backend".
- Set a variable: `baseUrl = http://localhost:3000`.

### Endpoints
1. **POST /messages**
   - **Purpose**: Store an encrypted message.
   - **Request**:
     - Method: POST
     - URL: `{{baseUrl}}/messages`
     - Body (JSON):
       ```json
       {
         "userId": "test-user",
         "message": "Hello, World!"
       }
       ```
   - **Expected Response**:
     - Status: `201 Created`
     - Body:
       ```json
       {
         "status": "Message stored successfully"
       }
       ```
   - **Test Cases**:
     - Missing `userId` or `message`: Expect `400 Bad Request`.

2. **GET /messages/:userId**
   - **Purpose**: Retrieve decrypted messages for a user.
   - **Request**:
     - Method: GET
     - URL: `{{baseUrl}}/messages/test-user`
   - **Expected Response**:
     - Status: `200 OK`
     - Body:
       ```json
       [
         {
           "id": "<uuid>",
           "message": "Hello, World!",
           "timestamp": 1739467890123
         }
       ]
       ```
   - **Test Cases**:
     - Non-existent `userId`: Expect `200 OK` with `[]`.
     - Multiple messages: Verify all are returned.

3. **POST /debug/decrypt**
   - **Purpose**: Test decryption logic.
   - **Request**:
     - Method: POST
     - URL: `{{baseUrl}}/debug/decrypt`
     - Body (JSON):
       ```json
       {
         "userId": "test-user",
         "encrypted": "<base64-encrypted-string>"
       }
       ```
     - Note: Obtain `encrypted` by logging database content (modify `db.js` temporarily) or generating manually.
   - **Expected Response**:
     - Status: `200 OK`
     - Body:
       ```json
       {
         "decrypted": "Hello, World!"
       }
       ```
   - **Test Cases**:
     - Invalid `encrypted`: Expect `500 Internal Server Error`.
     - Wrong `userId`: Expect decryption failure.

4. **Message Expiry** (Bonus)
   - Send `POST /messages`, wait >10 minutes (or adjust `TEN_MINUTES` in `db.js` to `10 * 1000` for 10 seconds).
   - Send `GET /messages/test-user`.
   - Expect: `[]` if messages expired.

## Design Decisions

### What encryption method and mode did you choose, and why?
- **Choice**: AES-256 in GCM mode.
- **Reason**:
  - **Security**: AES-256 is a widely trusted standard with a large key size, resistant to brute-force attacks.
  - **GCM Mode**: Provides authenticated encryption, ensuring both confidentiality and integrity, protecting against tampering.
  - **Efficiency**: Hardware-accelerated and suitable for variable-length messages.
  - **Standards**: Aligns with NIST recommendations for secure communication.

### How will you ensure only the original user can access their messages?
- **Key Derivation**: HKDF generates a unique 256-bit key per user, using `userId` and a server-side secret. Only the correct `userId` produces the right key for decryption.
- **Database Isolation**: Messages are stored in a `Map` keyed by `userId`, ensuring queries only access the user’s own data.
- **Future Authentication**: JWT-based authentication (partially implemented) would verify user identity before processing requests.
- **Error Handling**: Decryption fails gracefully if the wrong key is used, preventing unauthorized access.

### How do you plan to store and later extract the IV?
- **Storage**: A random 12-byte IV is generated per message and prepended to the ciphertext, followed by a 16-byte authentication tag. The combined payload (IV + ciphertext + authTag) is base64-encoded.
- **Extraction**: During decryption, the payload is decoded, and the first 12 bytes are taken as the IV, the last 16 bytes as the authTag, and the remainder as the ciphertext.
- **Benefit**: Embedding the IV simplifies storage and ensures it’s available for decryption without a separate database field.

### How would you prevent user ID spoofing to access other users' messages?
- **Authentication**: Planned JWT middleware (bonus) to verify user identity against `userId`.
- **Input Sanitization**: Validate `userId` to prevent injection or invalid formats.
- **Access Control**: Database queries are scoped to the provided `userId`, preventing cross-user access.
- **Key Security**: HKDF-derived keys depend on `userId`; a spoofed ID generates a wrong key, failing decryption.
- **Transport Security**: HTTPS (assumed in production) prevents interception of `userId`.

## Assumptions
- **Database**: In-memory `Map` for simplicity; production would use a persistent store like MongoDB or PostgreSQL.
- **Secret Management**: `SERVER_SECRET` in `.env`; production would use a secrets manager (e.g., AWS Secrets Manager).
- **Environment**: Single server instance; scaling would require distributed key handling.
- **Transport**: Local testing uses HTTP; production requires HTTPS.
- **Rate Limiting**: Not implemented; production would add it for DoS protection.

## Security Considerations
- **Encryption**: AES-256-GCM ensures strong protection; keys are never stored.
- **Key Rotation**: `SERVER_SECRET` should be rotated periodically in production.
- **Auditing**: Add logging for access attempts in production.
- **Dependencies**: Regularly update `express` and `dotenv` for security patches.
- **Backup**: In-memory DB is volatile; production needs persistent storage.

## Troubleshooting
- **Server Fails to Start**:
  - Check `.env` exists and `SERVER_SECRET` is set.
  - Verify port `3000` is free (`lsof -i :3000`).
- **Decryption Errors**:
  - Ensure `userId` matches the one used for encryption.
  - Validate `encrypted` string format (base64, correct length).
- **Postman Issues**:
  - Confirm JSON body syntax.
  - Check `baseUrl` variable.
- **Expiry Not Working**:
  - Adjust `TEN_MINUTES` in `db.js` for faster testing.
  - Ensure `cleanupExpired` is called (runs on `GET`).

For further assistance, review logs in `server.js` or contact the developer.