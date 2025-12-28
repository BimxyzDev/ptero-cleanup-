import PteroClient from '../lib/ptero-client.js';
import { validateInput } from '../utils/validation.js';
import { rateLimit } from '../lib/rate-limit.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    rateLimit(req);

    const body = typeof req.body === 'string'
      ? JSON.parse(req.body)
      : req.body;

    validateInput(body);

    const client = new PteroClient(body);

    return res.status(200).json({
      success: true,
      message: 'Cleanup endpoint OK'
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
      }
