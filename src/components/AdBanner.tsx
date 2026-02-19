import { useEffect, useRef } from 'react';

interface AdBannerProps {
    slot: string; // AdSense 광고 슬롯 ID
    format?: 'auto' | 'fluid' | 'rectangle';
    responsive?: boolean;
    className?: string;
}

/**
 * Google AdSense 배너 광고 컴포넌트
 * 
 * 사용법:
 * 1. Google AdSense에서 광고 단위 생성
 * 2. 광고 슬롯 ID를 받음
 * 3. <AdBanner slot="XXXXXXXXXX" /> 형태로 사용
 */
export default function AdBanner({
    slot,
    format = 'auto',
    responsive = true,
    className = ''
}: AdBannerProps) {
    const adRef = useRef<HTMLModElement>(null);

    useEffect(() => {
        // AdSense 스크립트가 로드되었는지 확인
        if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
            try {
                ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
            } catch (err) {
                console.error('AdSense error:', err);
            }
        }
    }, []);

    return (
        <div className={`ad-container ${className}`}>
            <ins
                ref={adRef}
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // 나중에 실제 ID로 교체
                data-ad-slot={slot}
                data-ad-format={format}
                data-full-width-responsive={responsive.toString()}
            />
        </div>
    );
}
