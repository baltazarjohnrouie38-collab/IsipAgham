/**
 * Dirty Dozen Security Rules Test Specification for IsipAgham
 * Verifies identity, integrity, PII isolation, and boundary constraints.
 */
export const dirtyDozenPayloads = [
  { name: 'Unauthenticated user read', path: '/users/userA', op: 'get', auth: null, expected: 'PERMISSION_DENIED' },
  { name: 'Cross-user PII read', path: '/users/userA', op: 'get', auth: { uid: 'userB' }, expected: 'PERMISSION_DENIED' },
  { name: 'Blanket users list scrape', path: '/users', op: 'list', auth: { uid: 'userA' }, expected: 'PERMISSION_DENIED' },
  { name: 'Shadow field injection on user create', path: '/users/userA', op: 'create', auth: { uid: 'userA' }, data: { uid: 'userA', email: 'a@b.ph', nickname: 'Juan', darkMode: false, xp: 0, isAdmin: true }, expected: 'PERMISSION_DENIED' },
  { name: 'PII leak on leaderboard', path: '/leaderboard/userA', op: 'create', auth: { uid: 'userA' }, data: { uid: 'userA', nickname: 'Juan', email: 'a@b.ph', xp: 0 }, expected: 'PERMISSION_DENIED' },
  { name: 'Cross-user leaderboard tamper', path: '/leaderboard/userA', op: 'update', auth: { uid: 'userB' }, data: { nickname: 'Hacked', xp: 9999 }, expected: 'PERMISSION_DENIED' },
  { name: 'Material ownership spoofing', path: '/materials/mat1', op: 'create', auth: { uid: 'userA' }, data: { id: 'mat1', userId: 'userB', title: 'Kinematics', course: 'Physics 1', sourceType: 'text', extractedText: 'v = d/t' }, expected: 'PERMISSION_DENIED' },
  { name: 'Oversized extractedText payload', path: '/materials/mat1', op: 'create', auth: { uid: 'userA' }, data: { id: 'mat1', userId: 'userA', title: 'Big', course: 'Physics 1', sourceType: 'text', extractedText: 'x'.repeat(100001) }, expected: 'PERMISSION_DENIED' },
  { name: 'Immutable userId tamper on update', path: '/materials/mat1', op: 'update', auth: { uid: 'userA' }, data: { userId: 'userB' }, expected: 'PERMISSION_DENIED' },
  { name: 'Cross-user studySet read', path: '/studySets/setB', op: 'get', auth: { uid: 'userA' }, expected: 'PERMISSION_DENIED' },
  { name: 'Forged client timestamp on create', path: '/users/userA', op: 'create', auth: { uid: 'userA' }, data: { uid: 'userA', email: 'a@b.ph', nickname: 'Juan', darkMode: false, xp: 0, createdAt: new Date(0), updatedAt: new Date(0) }, expected: 'PERMISSION_DENIED' },
  { name: 'Invalid document ID injection', path: '/materials/invalid$id!', op: 'create', auth: { uid: 'userA' }, data: { id: 'invalid$id!', userId: 'userA', title: 'Test', course: 'Physics 1', sourceType: 'text', extractedText: 'abc' }, expected: 'PERMISSION_DENIED' },
];
