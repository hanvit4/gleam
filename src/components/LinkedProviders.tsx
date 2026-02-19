import { useState, useEffect } from 'react';
import { Link, Trash2, Plus } from 'lucide-react';
import * as api from '../utils/api';
import { supabase } from '../utils/supabase/client';

interface Provider {
    id: string;
    provider: string;
    provider_email?: string;
    provider_name?: string;
    linked_at: string;
}

interface LinkedProvidersProps {
    onRefresh?: () => void;
}

export default function LinkedProviders({ onRefresh }: LinkedProvidersProps) {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [unlinking, setUnlinking] = useState<string | null>(null);

    // 소셜 계정 아이콘/이름 맵
    const providerConfig: Record<string, { name: string; color: string; icon: string }> = {
        'google': { name: 'Google', color: 'bg-[#f3f3f3]', icon: '🔍' },
        'kakao': { name: 'Kakao', color: 'bg-[#fae100]', icon: '💛' },
        'apple': { name: 'Apple', color: 'bg-[#000000]', icon: '🍎' },
        'github': { name: 'GitHub', color: 'bg-[#333333]', icon: '🐙' },
        'microsoft': { name: 'Microsoft', color: 'bg-[#0078d4]', icon: '🪟' },
    };

    useEffect(() => {
        loadProviders();
    }, []);

    const loadProviders = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await api.getUserProviders();
            setProviders(res.providers || []);
        } catch (err) {
            console.error('Failed to load providers:', err);
            setError('계정 연동 정보를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleUnlink = async (provider: string) => {
        if (!confirm('이 계정을 연동 해제하시겠습니까?')) return;

        try {
            setUnlinking(provider);
            await api.unlinkProvider(provider);
            setProviders(providers.filter((p) => p.provider !== provider));
            onRefresh?.();
        } catch (err) {
            console.error('Failed to unlink provider:', err);
            alert('연동 해제에 실패했습니다.');
        } finally {
            setUnlinking(null);
        }
    };

    const handleLinkGoogle = async () => {
        try {
            // Supabase의 linkIdentity를 사용하여 Google 계정 연동
            const { data, error } = await supabase.auth.linkIdentity({
                provider: 'google',
            });

            if (error) {
                console.error('Google 연동 실패:', error);
                alert('Google 계정 연동에 실패했습니다.');
                return;
            }

            // 연동 성공 후 목록 새로고침
            await loadProviders();
            onRefresh?.();
        } catch (err) {
            console.error('Google 연동 에러:', err);
            alert('Google 계정 연동 중 오류가 발생했습니다.');
        }
    };

    const handleLinkKakao = async () => {
        try {
            // Supabase의 linkIdentity를 사용하여 Kakao 계정 연동
            const { data, error } = await supabase.auth.linkIdentity({
                provider: 'kakao',
                options: {
                    scopes: 'profile_nickname account_email',
                },
            });

            if (error) {
                console.error('Kakao 연동 실패:', error);
                alert('Kakao 계정 연동에 실패했습니다.');
                return;
            }

            // 연동 성공 후 목록 새로고침
            await loadProviders();
            onRefresh?.();
        } catch (err) {
            console.error('Kakao 연동 에러:', err);
            alert('Kakao 계정 연동 중 오류가 발생했습니다.');
        }
    };

    const getConfig = (provider: string) => {
        return providerConfig[provider.toLowerCase()] || { name: provider, color: 'bg-[#e8def8]', icon: '🔗' };
    };

    return (
        <div className="bg-white rounded-[16px] shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-[#e7e0ec]">
                <Link className="w-5 h-5 text-[#6750a4]" />
                <h3 className="text-[#1d1b20] font-semibold text-base">소셜 계정 연동</h3>
            </div>

            {/* Content */}
            <div className="p-4">
                {loading ? (
                    <p className="text-center text-[#79747e] text-sm">연동된 계정을 불러오는 중...</p>
                ) : error ? (
                    <p className="text-center text-[#ba1a1a] text-sm">{error}</p>
                ) : providers.length === 0 ? (
                    <p className="text-center text-[#79747e] text-sm mb-4">연동된 계정이 없습니다.</p>
                ) : (
                    <div className="space-y-3 mb-4">
                        {providers.map((p) => {
                            const config = getConfig(p.provider);
                            return (
                                <div
                                    key={p.provider}
                                    className={`flex items-center justify-between p-3 rounded-[12px] ${config.color} border border-[#e7e0ec]`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{config.icon}</span>
                                        <div className="flex-1">
                                            <p className="text-[#1d1b20] font-medium text-sm">{config.name}</p>
                                            {p.provider_email && (
                                                <p className="text-[#79747e] text-xs">{p.provider_email}</p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleUnlink(p.provider)}
                                        disabled={unlinking === p.provider}
                                        className="p-2 hover:bg-white/50 rounded-full transition-colors active:bg-white/70 disabled:opacity-50 cursor-not-allowed"
                                        title="연동 해제"
                                    >
                                        <Trash2 className="w-4 h-4 text-[#ba1a1a]" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Link New Account Buttons */}
                <div className="space-y-2 border-t border-[#e7e0ec] pt-4">
                    <p className="text-[#49454f] text-xs font-medium mb-3">새로운 계정 연동</p>

                    {providers.find((p) => p.provider === 'google') === undefined && (
                        <button
                            onClick={handleLinkGoogle}
                            className="w-full flex items-center gap-3 p-3 rounded-[12px] bg-[#f3f3f3] border border-[#e7e0ec] hover:bg-[#e8e8e8] transition-colors active:bg-[#ddd]"
                        >
                            <span className="text-xl">🔍</span>
                            <span className="flex-1 text-left text-[#1d1b20] font-medium text-sm">Google으로 연동</span>
                            <Plus className="w-4 h-4 text-[#6750a4]" />
                        </button>
                    )}

                    {providers.find((p) => p.provider === 'kakao') === undefined && (
                        <button
                            onClick={handleLinkKakao}
                            className="w-full flex items-center gap-3 p-3 rounded-[12px] bg-[#fae100] border border-[#e7e0ec] hover:bg-[#f5d700] transition-colors active:bg-[#ecc200]"
                        >
                            <span className="text-xl">💛</span>
                            <span className="flex-1 text-left text-[#1d1b20] font-medium text-sm">Kakao로 연동</span>
                            <Plus className="w-4 h-4 text-[#1d1b20]" />
                        </button>
                    )}

                    {providers.find((p) => p.provider === 'apple') === undefined && (
                        <button
                            onClick={() => alert('Apple 계정 연동은 준비 중입니다.')}
                            className="w-full flex items-center gap-3 p-3 rounded-[12px] bg-[#000000] border border-[#e7e0ec] hover:bg-[#1a1a1a] transition-colors active:bg-[#333]"
                        >
                            <span className="text-xl">🍎</span>
                            <span className="flex-1 text-left text-white font-medium text-sm">Apple로 연동</span>
                            <Plus className="w-4 h-4 text-white" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
