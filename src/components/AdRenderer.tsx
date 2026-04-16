import React, { useEffect, useState } from 'react';
import { supabase } from '../core/supabase';

interface AdRendererProps {
  position: 'header' | 'middle' | 'sidebar';
}

export const AdRenderer: React.FC<AdRendererProps> = ({ position }) => {
  const [adScript, setAdScript] = useState<string>('');

  useEffect(() => {
    const fetchAd = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', `ad_${position}`)
        .single();
      
      if (data && !error) {
        setAdScript(data.value);
      }
    };
    fetchAd();
  }, [position]);

  if (!adScript) return null;

  return (
    <div 
      className="ad-container"
      dangerouslySetInnerHTML={{ __html: adScript }} 
    />
  );
};
