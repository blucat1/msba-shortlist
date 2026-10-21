import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { completeAuthCallback } from '../lib/supabase';
import { Busy } from '../components/ui';
export function AuthCallback() { const navigate = useNavigate(); const [error, setError] = useState(''); useEffect(() => { let live = true; completeAuthCallback().then(() => { if (live) navigate('/opportunities', { replace: true }); }).catch(e => { if (live) setError(e.message); }); return () => { live = false; }; }, [navigate]); return error ? <div className="standalone-card"><h1>Sign-in could not finish</h1><p role="alert">{error}</p><Link to="/opportunities">Return to opportunities</Link></div> : <Busy />; }
