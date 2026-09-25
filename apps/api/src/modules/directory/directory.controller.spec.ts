import { DirectoryController } from './directory.controller';

describe('DirectoryController public Digital ID boundary', () => {
  it.each([
    'UkhDLTIwMjYtMDAwMDAwMDE',
    'R0hDLTIwMjYtMDAwMDAwMDE',
    'not-a-valid-reference',
  ])('does not look up or disclose identity for a guessed reference (%s)', async (token) => {
    const findUnique = jest.fn();
    const controller = new DirectoryController({ userProfile: { findUnique } } as any);

    expect(controller.verifyRhcId(token)).toEqual({
      valid: false,
      status: 'UNAVAILABLE',
      message: 'Public RHC Digital ID verification is not configured.',
    });
    expect(findUnique).not.toHaveBeenCalled();
  });
});
