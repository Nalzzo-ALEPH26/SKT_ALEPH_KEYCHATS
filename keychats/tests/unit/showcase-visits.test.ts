import { describe, expect, it, vi, beforeEach } from 'vitest'
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), active: vi.fn(), create: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.create }))
vi.mock('@/lib/auth/guards', () => ({ requireActiveUser: mocks.active }))
vi.mock('@/lib/auth/server-access', () => ({ createAuthGuardAccess: () => ({}) }))
import { recordShowcaseVisitAction } from '@/app/(workspace)/showcase/visit-actions'
import { parseVisitCount } from '@/lib/community/visit-counts'
const id='11111111-1111-1111-1111-111111111111'
beforeEach(() => { vi.resetAllMocks(); mocks.create.mockResolvedValue({rpc:mocks.rpc}); mocks.active.mockResolvedValue({claims:{sub:'viewer'}}) })
describe('방문 수 저장', () => {
  it('DB에 사이트 ID만 전달하고 확정된 숫자를 반환한다', async () => {
    mocks.rpc.mockResolvedValue({data:{count:7,counted:true},error:null})
    expect(await recordShowcaseVisitAction(id)).toEqual({count:7,counted:true})
    expect(mocks.rpc).toHaveBeenCalledWith('record_showcase_visit',{target_site_id:id})
  })
  it('중복 클릭의 서버 결과를 그대로 반환한다', async () => {
    mocks.rpc.mockResolvedValue({data:{count:7,counted:false},error:null})
    expect(await recordShowcaseVisitAction(id)).toEqual({count:7,counted:false})
  })
  it('SQL 미적용이나 통신 오류가 링크 동작을 중단하지 않도록 실패 결과를 반환한다', async () => {
    mocks.rpc.mockResolvedValue({data:null,error:{code:'PGRST202'}})
    expect(await recordShowcaseVisitAction(id)).toEqual({count:null,counted:false})
    mocks.rpc.mockRejectedValue(new Error('network'))
    await expect(recordShowcaseVisitAction(id)).resolves.toEqual({count:null,counted:false})
  })
  it('비활성 또는 비로그인 사용자는 RPC 호출하지 않는다', async () => {
    mocks.active.mockRejectedValue(new Error('USER_INACTIVE'))
    expect(await recordShowcaseVisitAction(id)).toEqual({count:null,counted:false})
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('잘못된 사이트 ID는 DB에 전달하지 않는다', async () => {
    await recordShowcaseVisitAction('not-an-id')
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('손상된 집계값을 0으로 오인하지 않는다', () => {
    expect(parseVisitCount('12')).toBe(12)
    for (const value of [null, undefined, '', -1, 1.5, 'NaN', true, '999999999999999999999999']) expect(parseVisitCount(value)).toBeNull()
  })
})
