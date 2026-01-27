/**
 * tests/modules/keihi/KeihiService.test.js
 * 象徴的なユニットテスト
 */

const service = require('../../../src/modules/keihi/KeihiService');

describe('KeihiService', () => {
    describe('roleMentionFromIds', () => {
        it('should return space-separated mentions for valid role IDs', () => {
            const mockGuild = {
                roles: {
                    cache: new Map([
                        ['123', { id: '123' }],
                        ['456', { id: '456' }]
                    ])
                }
            };
            const result = service.roleMentionFromIds(mockGuild, ['123', '456']);
            expect(result).toBe('<@&123> <@&456>');
        });

        it('should return null if no roles found', () => {
            const mockGuild = { roles: { cache: new Map() } };
            const result = service.roleMentionFromIds(mockGuild, ['999']);
            expect(result).toBeNull();
        });
    });

    describe('describeApprovers', () => {
        it('should return "未設定" if no config provided', () => {
            const result = service.describeApprovers({}, {}, {});
            expect(result).toBe('未設定');
        });

        it('should resolve position names and mentions', () => {
            const mockGuild = {
                roles: {
                    cache: new Map([['role_a', { id: 'role_a' }]])
                }
            };
            const storeRoleConfig = {
                positionRoles: { pos1: ['role_a'] },
                roles: [{ id: 'pos1', name: 'マネージャー' }]
            };
            const keihiConfig = { approverPositionIds: ['pos1'] };

            const result = service.describeApprovers(mockGuild, storeRoleConfig, keihiConfig);
            expect(result).toContain('マネージャー: <@&role_a>');
        });
    });
});
