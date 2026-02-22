import { useState, useEffect } from 'react';
import { Link, Trash2, Plus } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';

const PENDING_LINK_KEY = 'pending_social_link';
const PENDING_LINK_MAX_AGE_MS = 15 * 60 * 1000;
const GLOBAL_LINK_ERROR_KEY = 'social_link_error_notice';

// 로컬/배포 환경 자동 감지
const getRedirectUrl = () => {
    return window.location.origin;
};

interface Provider {
    id: string;
    provider: string;
    provider_email?: string;
    provider_name?: string;
    linked_at: string;
    identity: any;
}

interface LinkedProvidersProps {
    onRefresh?: () => void;
}

interface LinkError {
    type: 'duplicate_email' | 'already_linked' | 'generic';
    message: string;
    details?: string;
    provider?: string;
}

interface PendingSocialLink {
    provider: 'google' | 'kakao' | 'apple';
    startedAt: number;
}

interface GlobalLinkErrorNotice {
    message: string;
    details?: string;
    createdAt: number;
}

export default function LinkedProviders({ onRefresh }: LinkedProvidersProps) {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [linkError, setLinkError] = useState<LinkError | null>(null);
    const [unlinking, setUnlinking] = useState<string | null>(null);
    const [linking, setLinking] = useState<string | null>(null);

    // 소셜 계정 아이콘/이름 맵
    const providerConfig: Record<string, { name: string; color: string; icon: string }> = {
        'google': { name: 'Google', color: 'bg-[#f3f3f3]', icon: '🔍' },
        'kakao': { name: 'Kakao', color: 'bg-[#fae100]', icon: '💛' },
        'apple': { name: 'Apple', color: 'bg-[#000000]', icon: '🍎' },
        'github': { name: 'GitHub', color: 'bg-[#333333]', icon: '🐙' },
        'microsoft': { name: 'Microsoft', color: 'bg-[#0078d4]', icon: '🪟' },
    };

    useEffect(() => {
        handleLinkCallbackRecovery();
    }, []);

    const readPendingLink = (): PendingSocialLink | null => {
        try {
            const raw = localStorage.getItem(PENDING_LINK_KEY);
            if (!raw) return null;
            return JSON.parse(raw) as PendingSocialLink;
        } catch {
            return null;
        }
    };

    const clearPendingLink = () => {
        localStorage.removeItem(PENDING_LINK_KEY);
    };

    const saveGlobalLinkError = (message: string, details?: string) => {
        const payload: GlobalLinkErrorNotice = {
            message,
            details,
            createdAt: Date.now(),
        };
        localStorage.setItem(GLOBAL_LINK_ERROR_KEY, JSON.stringify(payload));
    };

    const setLinkFailure = (errorObj: LinkError) => {
        setLinkError(errorObj);
        saveGlobalLinkError(errorObj.message, errorObj.details);
        toast.error(errorObj.message);
    };

    const savePendingLink = (provider: 'google' | 'kakao' | 'apple') => {
        const payload: PendingSocialLink = {
            provider,
            startedAt: Date.now(),
        };
        localStorage.setItem(PENDING_LINK_KEY, JSON.stringify(payload));
    };

    const cleanupOAuthParamsFromUrl = () => {
        const url = new URL(window.location.href);
        const queryParamsToRemove = [
            'error',
            'error_code',
            'error_description',
            'code',
            'state',
            'provider',
        ];

        queryParamsToRemove.forEach((key) => url.searchParams.delete(key));

        if (url.hash) {
            const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
            queryParamsToRemove.forEach((key) => hash.delete(key));
            const cleanedHash = hash.toString();
            url.hash = cleanedHash ? `#${cleanedHash}` : '';
        }

        const next = `${url.pathname}${url.search}${url.hash}`;
        window.history.replaceState({}, '', next);
    };

    const parseOAuthErrorFromUrl = () => {
        const url = new URL(window.location.href);
        const query = url.searchParams;
        const hash = new URLSearchParams(url.hash.replace(/^#/, ''));

        const error = query.get('error') || hash.get('error');
        const errorCode = query.get('error_code') || hash.get('error_code');
        const errorDescription = query.get('error_description') || hash.get('error_description');

        if (!error && !errorCode && !errorDescription) return null;

        return {
            error: error || '',
            errorCode: errorCode || '',
            errorDescription: decodeURIComponent(errorDescription || ''),
        };
    };

    const mapLinkError = (provider: 'google' | 'kakao' | 'apple', rawError: string) => {
        const providerName = getConfig(provider).name;
        const msg = rawError.toLowerCase();

        if (
            msg.includes('identity_already_exists') ||
            msg.includes('already registered') ||
            msg.includes('already exists') ||
            msg.includes('duplicate') ||
            msg.includes('conflict') ||
            msg.includes('unique constraint')
        ) {
            return {
                type: 'duplicate_email' as const,
                message: `${providerName} 계정은 이미 다른 사용자에 등록되어 연동할 수 없습니다.`,
                details: '이미 DB에 존재하는 계정입니다. 다른 계정으로 시도해주세요.',
                provider,
            };
        }

        if (msg.includes('already linked') || msg.includes('linked')) {
            return {
                type: 'already_linked' as const,
                message: `이미 연동된 ${providerName} 계정입니다.`,
                details: '현재 계정에 이미 연결되어 있습니다.',
                provider,
            };
        }

        if (msg.includes('access_denied') || msg.includes('cancel')) {
            return {
                type: 'generic' as const,
                message: `${providerName} 연동이 취소되었습니다.`,
                details: '인증 과정에서 취소되었거나 권한이 거부되었습니다.',
                provider,
            };
        }

        return {
            type: 'generic' as const,
            message: `${providerName} 계정 연동에 실패했습니다.`,
            details: rawError || '다시 시도해주세요.',
            provider,
        };
    };

    const handleLinkCallbackRecovery = async () => {
        const pending = readPendingLink();
        if (!pending) {
            await loadProviders();
            return;
        }

        if (Date.now() - pending.startedAt > PENDING_LINK_MAX_AGE_MS) {
            clearPendingLink();
            await loadProviders();
            return;
        }

        const oauthErr = parseOAuthErrorFromUrl();
        if (oauthErr) {
            const combined = `${oauthErr.error} ${oauthErr.errorCode} ${oauthErr.errorDescription}`.trim();
            const mapped = mapLinkError(pending.provider, combined);
            setLinkFailure(mapped);
            clearPendingLink();
            cleanupOAuthParamsFromUrl();
            await loadProviders();
            return;
        }

        const fresh = await loadProviders();
        const hasProvider = fresh.some((p) => p.provider === pending.provider);

        if (!hasProvider) {
            const mapped = mapLinkError(
                pending.provider,
                'identity_already_exists or account conflict'
            );
            setLinkFailure(mapped);
        } else {
            setLinkError(null);
            toast.success(`${getConfig(pending.provider).name} 계정이 연동되었습니다.`);
        }

        clearPendingLink();
        cleanupOAuthParamsFromUrl();
    };

    const loadProviders = async (): Promise<Provider[]> => {
        try {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase.auth.getUser();

            if (error) throw error;

            const identities = data.user?.identities || [];
            const mapped: Provider[] = identities.map((identity: any) => ({
                id: identity.id,
                provider: identity.provider,
                provider_email: identity.identity_data?.email,
                provider_name:
                    identity.identity_data?.full_name ||
                    identity.identity_data?.name ||
                    identity.identity_data?.nickname,
                linked_at: identity.created_at || new Date().toISOString(),
                identity,
            }));

            setProviders(mapped);
            return mapped;
        } catch (err) {
            console.error('Failed to load providers:', err);
            setError('계정 연동 정보를 불러오지 못했습니다.');
            return [];
        } finally {
            setLoading(false);
        }
    };

    const handleUnlink = async (provider: string) => {
        if (providers.length <= 1) {
            toast.info('마지막 로그인 계정은 연동 해제할 수 없습니다.');
            return;
        }

        if (!confirm('이 계정을 연동 해제하시겠습니까?')) return;

        try {
            setUnlinking(provider);

            const target = providers.find((p) => p.provider === provider);
            if (!target?.identity) {
                throw new Error('연동 해제 대상 계정을 찾지 못했습니다.');
            }

            const { error } = await supabase.auth.unlinkIdentity(target.identity);
            if (error) throw error;

            setProviders((prev) => prev.filter((p) => p.provider !== provider));
            toast.success(`${getConfig(provider).name} 계정 연동이 해제되었습니다.`);
            onRefresh?.();
        } catch (err) {
            console.error('Failed to unlink provider:', err);
            toast.error('연동 해제에 실패했습니다.');
        } finally {
            setUnlinking(null);
        }
    };

    const handleLinkProvider = async (provider: 'google' | 'kakao' | 'apple') => {
        try {
            setLinking(provider);
            setLinkError(null);
            savePendingLink(provider);
            const providerName = getConfig(provider).name;
            const redirectUrl = getRedirectUrl();

            console.log(`🟢 [LinkIdentity] ${provider} 연동 시작`);
            console.log('📍 hostname:', window.location.hostname);
            console.log('📍 redirectTo:', redirectUrl);

            const options: any = {
                redirectTo: getRedirectUrl(),
            };

            if (provider === 'kakao') {
                options.scopes = 'profile_nickname account_email';
            }

            const { data, error } = await supabase.auth.linkIdentity({
                provider,
                options,
            });

            console.log(`[LinkIdentity] 응답:`, { provider, hasUrl: !!data?.url, error, data });

            if (error) {
                console.error(`${provider} 연동 실패:`, error);
                clearPendingLink();

                // 에러 타입 분석
                let linkErrorObj: LinkError;
                const errorMsg = error.message?.toLowerCase() || '';

                // 중복/이미 사용 중인 이메일 감지
                if (errorMsg.includes('duplicate') ||
                    errorMsg.includes('already') ||
                    errorMsg.includes('conflict') ||
                    errorMsg.includes('unique constraint')) {
                    linkErrorObj = {
                        type: 'duplicate_email',
                        message: `⚠️ ${providerName} 계정이 이미 사용 중입니다`,
                        details: `이 이메일/계정은 다른 사용자에게 이미 연동되어 있습니다.\n다른 계정으로 시도해주세요.`,
                        provider
                    };
                } else if (errorMsg.includes('linked') || errorMsg.includes('already linked')) {
                    linkErrorObj = {
                        type: 'already_linked',
                        message: `이미 연동된 ${providerName} 계정입니다`,
                        details: '이 계정은 현재 사용자에게 이미 연동되어 있습니다.',
                        provider
                    };
                } else if (errorMsg.includes('manual_linking_disabled')) {
                    linkErrorObj = {
                        type: 'generic',
                        message: `${providerName} 연동이 비활성화 상태입니다`,
                        details: '관리자에게 문의해주세요.',
                        provider
                    };
                } else {
                    linkErrorObj = {
                        type: 'generic',
                        message: `${providerName} 계정 연동에 실패했습니다`,
                        details: error.message || '다시 시도해주세요.',
                        provider
                    };
                }

                setLinkFailure(linkErrorObj);
                return;
            }

            // OAuth 리다이렉트가 필요한 경우
            if (data?.url) {
                console.log(`[LinkIdentity] OAuth URL로 리다이렉트:`, data.url);
                toast.info(`${providerName} 인증 페이지로 이동합니다.`);
                window.location.href = data.url;
                return;
            }

            // 리다이렉트 없이 바로 연동 완료된 경우
            console.log(`[LinkIdentity] 리다이렉트 없이 연동 완료, 데이터 새로고침`);
            await loadProviders();

            // 새로고침 후 실제로 연동됐는지 확인
            const { data: userData } = await supabase.auth.getUser();
            const isLinked = userData?.user?.identities?.some((id: any) => id.provider === provider);

            if (isLinked) {
                toast.success(`${providerName} 계정이 연동되었습니다.`);
                console.log(`[LinkIdentity] ✓ ${provider} 연동 확인 완료`);
                setLinkError(null);
                clearPendingLink();
            } else {
                const errorObj: LinkError = {
                    type: 'generic',
                    message: `${providerName} 연동 확인 실패`,
                    details: '다시 시도해주세요.',
                    provider
                };
                setLinkError(errorObj);
                setLinkFailure(errorObj);
                console.warn(`[LinkIdentity] ✗ ${provider} identities에서 미확인`);
                clearPendingLink();
            }

            onRefresh?.();
        } catch (err: any) {
            console.error(`${provider} 연동 에러:`, err);
            clearPendingLink();
            const errMsg = err?.message || String(err);
            const errorObj: LinkError = {
                type: 'generic',
                message: `${getConfig(provider).name} 계정 연동 중 오류가 발생했습니다.`,
                details: errMsg,
                provider
            };
            setLinkFailure(errorObj);
        } finally {
            setLinking(null);
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
                {/* Link Error Alert */}
                {linkError && (
                    <div className={`mb-4 p-4 rounded-[12px] border-l-4 ${linkError.type === 'duplicate_email'
                        ? 'bg-[#fff3f3] border-[#ba1a1a]'
                        : 'bg-[#fff3f3] border-[#ba1a1a]'
                        }`}>
                        <div className="flex items-start gap-3">
                            <div className="text-xl mt-1">⚠️</div>
                            <div className="flex-1">
                                <p className="text-[#ba1a1a] font-semibold text-sm mb-1">{linkError.message}</p>
                                {linkError.details && (
                                    <p className="text-[#ba1a1a] text-xs opacity-90">{linkError.details}</p>
                                )}
                            </div>
                            <button
                                onClick={() => setLinkError(null)}
                                className="text-[#ba1a1a] hover:opacity-70 transition-opacity"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

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
                                        disabled={unlinking === p.provider || providers.length <= 1}
                                        className="p-2 hover:bg-white/50 rounded-full transition-colors active:bg-white/70 disabled:opacity-50 cursor-not-allowed"
                                        title={providers.length <= 1 ? '마지막 계정은 해제할 수 없습니다' : '연동 해제'}
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
                            onClick={() => handleLinkProvider('google')}
                            disabled={linking !== null}
                            className="w-full flex items-center gap-3 p-3 rounded-[12px] bg-[#f3f3f3] border border-[#e7e0ec] hover:bg-[#e8e8e8] transition-colors active:bg-[#ddd]"
                        >
                            <span className="text-xl">🔍</span>
                            <span className="flex-1 text-left text-[#1d1b20] font-medium text-sm">Google으로 연동</span>
                            <Plus className="w-4 h-4 text-[#6750a4]" />
                        </button>
                    )}

                    {providers.find((p) => p.provider === 'kakao') === undefined && (
                        <button
                            onClick={() => handleLinkProvider('kakao')}
                            disabled={linking !== null}
                            className="w-full flex items-center gap-3 p-3 rounded-[12px] bg-[#fae100] border border-[#e7e0ec] hover:bg-[#f5d700] transition-colors active:bg-[#ecc200]"
                        >
                            <span className="text-xl">💛</span>
                            <span className="flex-1 text-left text-[#1d1b20] font-medium text-sm">Kakao로 연동</span>
                            <Plus className="w-4 h-4 text-[#1d1b20]" />
                        </button>
                    )}

                    {providers.find((p) => p.provider === 'apple') === undefined && (
                        <button
                            onClick={() => handleLinkProvider('apple')}
                            disabled={linking !== null}
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
