import jwt from 'jsonwebtoken';

export function createToken(therapist) {
  return jwt.sign(
    { sub: therapist._id.toString(), role: 'therapist' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// A scoped client token is only issued after an intake, booking, or therapist-generated portal link.
export function createClientPortalToken(client) {
  return jwt.sign(
    { sub: client._id.toString(), therapistId: client.therapist.toString(), role: 'client_portal' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}
