// Extend Jest with @testing-library/jest-dom matchers such as toBeDisabled
// and toBeInTheDocument. Vitest loads this file for test runs.
import '@testing-library/jest-dom';

import { vi } from 'vitest';

// Keep the existing Jest-style tests source-compatible during the migration.
(globalThis as typeof globalThis & { jest: typeof vi }).jest = vi;
