import { useState } from 'react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';
import * as api from '../utils/api';

interface SetServiceEmailScreenProps {
    onEmailSet: () => void;
    onCancel: () => void;
}

export default function SetServiceEmailScreen({ onEmailSet, onCancel }: SetServiceEmailScreenProps) {
    const [serviceEmail, setServiceEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSetEmail = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!serviceEmail.trim()) {
            setError('이메일을 입력해주세요.');
            return;
        }

        // 기본 이메일 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(serviceEmail)) {
            setError('유효한 이메일 형식이 아닙니다.');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            console.log('🔵 service_email 중복 체크:', serviceEmail);

            // API를 통해 중복 체크
            const checkResult = await api.checkServiceEmailDuplicate(serviceEmail);

            if (checkResult.exists) {
                toast.error(
                    '이 이메일로 이미 가입된 계정이 있습니다.\n' +
                    '기존 계정으로 로그인한 후\n' +
                    '"소셜 계정 연동" 기능을 사용해주세요.'
                );
                console.warn('❌ service_email 중복 감지:', serviceEmail);

                // 로그아웃 처리
                await supabase.auth.signOut();
                onCancel();
                return;
            }

            // 중복 없으면 service_email 저장
            console.log('✅ service_email 저장:', serviceEmail);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user?.id) {
                throw new Error('사용자 정보를 찾을 수 없습니다.');
            }

            // users 테이블에 service_email 저장
            const { error: updateError } = await supabase
                .from('users')
                .update({ service_email: serviceEmail })
                .eq('auth_user_id', user.id);

            if (updateError) {
                throw updateError;
            }

            toast.success('가입이 완료되었습니다!');
            onEmailSet();
        } catch (err: any) {
            console.error('service_email 설정 에러:', err);
            setError(err?.message || '오류가 발생했습니다.');
            toast.error('오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fef7ff] flex items-center justify-center px-4">
            <div className="max-w-[360px] w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-[#1d1b20] text-3xl font-bold mb-2">환영합니다!</h1>
                    <p className="text-[#49454f] text-base">
                        서비스에서 사용할 이메일을 입력해주세요
                    </p>
                </div>

                {/* Info Card */}
                <div className="bg-[#e8def8] rounded-[16px] p-4 mb-6 border border-[#6750a4]/20">
                    <p className="text-[#1d1b20] text-sm font-medium mb-2">📧 서비스 이메일</p>
                    <p className="text-[#49454f] text-xs">
                        Google, Kakao 등 여러 소셜 계정을 이 이메일로 통합할 수 있습니다.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSetEmail} className="space-y-4">
                    {/* Email Input */}
                    <div>
                        <label className="text-[#49454f] text-sm font-medium mb-2 block">
                            서비스 이메일
                        </label>
                        <input
                            type="email"
                            value={serviceEmail}
                            onChange={(e) => {
                                setServiceEmail(e.target.value);
                                setError(null);
                            }}
                            placeholder="example@gmail.com"
                            disabled={isLoading}
                            className="w-full px-4 py-3 border border-[#e7e0ec] rounded-[12px] 
                         text-[#1d1b20] placeholder-[#79747e]
                         focus:outline-none focus:ring-2 focus:ring-[#6750a4]
                         disabled:bg-[#f5f5f5] disabled:cursor-not-allowed"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-[#fce4ec] border border-[#ba1a1a] rounded-[12px] p-3">
                            <p className="text-[#ba1a1a] text-sm">{error}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-[#6750a4] text-white rounded-full font-medium text-base
                       hover:bg-[#5d4595] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>처리 중...</span>
                            </div>
                        ) : (
                            '가입 완료'
                        )}
                    </button>

                    {/* Cancel Button */}
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="w-full py-3 bg-white text-[#6750a4] rounded-full font-medium text-base
                       border border-[#e7e0ec] hover:bg-[#f5f5f5]
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        돌아가기
                    </button>
                </form>

                {/* Info */}
                <p className="text-center text-[#79747e] text-xs mt-6">
                    이 이메일은 나중에 변경할 수 없습니다.
                </p>
            </div>
        </div>
    );
}
