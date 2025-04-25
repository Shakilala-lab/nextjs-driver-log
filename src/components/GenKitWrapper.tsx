
import dynamic from 'next/dynamic';

const GenKit = dynamic(() => import('./GenKit'), { ssr: false });

export default GenKit;
