import type { PhysicsCourse } from '../types';

export interface SeedMaterialTemplate {
  title: string;
  course: PhysicsCourse;
  extractedText: string;
}

export const SEED_PHYSICS_MATERIALS: SeedMaterialTemplate[] = [
  {
    title: 'Kinematics, Projectile Motion & Newton’s Laws (Sample)',
    course: 'Physics 1',
    extractedText: `DepEd SHS General Physics 1 — Mechanics Reviewer

1. Uniformly Accelerated Motion (1D Kinematics)
- Average velocity: v_avg = Δx / Δt (unit: m/s)
- Acceleration: a = (v_f - v_i) / t (unit: m/s²)
- Kinematic equations:
  • v_f = v_i + a * t
  • Δx = v_i * t + 0.5 * a * t²
  • v_f² = v_i² + 2 * a * Δx
- Free fall near Earth's surface: acceleration due to gravity g = 9.8 m/s² downward.

2. Projectile Motion (2D Motion)
- Horizontal motion has zero acceleration (a_x = 0): v_x = v_0 * cos(θ), x = v_0 * cos(θ) * t.
- Vertical motion has constant downward acceleration (a_y = -g): v_y = v_0 * sin(θ) - g * t, y = v_0 * sin(θ) * t - 0.5 * g * t².
- On level ground: Range R = (v_0² * sin(2θ)) / g. Maximum range occurs at θ = 45°.

3. Newton’s Laws of Motion & Friction
- First Law (Inertia): An object remains at rest or in uniform motion unless acted on by a net external force.
- Second Law: F_net = m * a (1 Newton = 1 kg·m/s²).
- Third Law: For every action force, there is an equal and opposite reaction force.
- Kinetic friction: f_k = μ_k * N. On an incline of angle θ: Normal force N = m * g * cos(θ), parallel gravity component = m * g * sin(θ).

4. Momentum, Collisions & Rotational Motion
- Linear momentum: p = m * v (unit: kg·m/s). Impulse: J = F_net * Δt = Δp.
- Elastic collision conserves both momentum and kinetic energy; inelastic collision conserves momentum only.
- Uniform circular motion centripetal acceleration: a_c = v² / r.
- Torque: τ = r * F * sin(θ) (unit: N·m).`,
  },
  {
    title: 'Gravitation, Fluids & Thermodynamics (Sample)',
    course: 'Physics 2',
    extractedText: `DepEd SHS General Physics 2 — Gravitation, Fluid Mechanics & Thermodynamics

1. Universal Gravitation & Orbits
- Newton's Law of Universal Gravitation: F = G * (m_1 * m_2) / r², where G = 6.67 × 10^-11 N·m²/kg².
- Orbital speed of a satellite: v = sqrt(G * M / r). Period squared is proportional to radius cubed (Kepler's Third Law): T² = (4π² / (G * M)) * r³.

2. Fluid Statics: Pascal & Archimedes
- Pressure: P = F / A (unit: Pascal, 1 Pa = 1 N/m²). Hydrostatic pressure at depth h: P = P_0 + ρ * g * h.
- Pascal's Principle: Pressure applied to an enclosed fluid is transmitted undiminished. Hydraulic lift: F_1 / A_1 = F_2 / A_2.
- Archimedes' Principle (Buoyancy): Buoyant force F_B = ρ_fluid * V_displaced * g. An object floats if average density is less than fluid density.

3. Fluid Dynamics: Continuity & Bernoulli
- Equation of Continuity for incompressible flow: A_1 * v_1 = A_2 * v_2 (volume flow rate Q = A * v in m³/s).
- Bernoulli's Equation: P + 0.5 * ρ * v² + ρ * g * y = constant. Faster fluid speed corresponds to lower static pressure at the same height.

4. Heat Transfer & Thermodynamics
- Linear thermal expansion: ΔL = α * L_0 * ΔT.
- Specific heat: Q = m * c * ΔT (unit: Joule, J).
- First Law of Thermodynamics: ΔU = Q - W (change in internal energy equals heat added minus work done by the system).
- Ideal Gas Law: P * V = n * R * T, where R = 8.314 J/(mol·K). Work in a PV cycle equals the enclosed area on a PV diagram.`,
  },
  {
    title: 'Electrostatics, DC Circuits & Electromagnetism (Sample)',
    course: 'Physics 3',
    extractedText: `DepEd SHS General Physics 3 — Electricity & Magnetism

1. Electric Charges & Coulomb's Law
- Elementary charge e = 1.602 × 10^-19 C. Like charges repel; opposite charges attract.
- Coulomb's Law: F = k * |q_1 * q_2| / r², where k = 8.99 × 10^9 N·m²/C².
- Electric field: E = F / q = k * Q / r² (unit: N/C or V/m), pointing away from positive charges and toward negative charges.

2. Electric Current, Ohm's Law & DC Circuits
- Electric current: I = ΔQ / Δt (unit: Ampere, 1 A = 1 C/s).
- Ohm's Law: V = I * R (Voltage in Volts V, Current in Amperes A, Resistance in Ohms Ω).
- Electric power: P = V * I = I² * R = V² / R (unit: Watt, W).
- Series resistors: R_eq = R_1 + R_2 + ... (same current I through each).
- Parallel resistors: 1 / R_eq = 1 / R_1 + 1 / R_2 + ... (same voltage V across each).

3. Magnetism & Electromagnetic Induction
- Magnetic field around a long straight wire: B = (μ_0 * I) / (2π * r) (unit: Tesla, T), direction given by right-hand rule.
- Magnetic field inside a solenoid: B = μ_0 * n * I, where n = N / L (turns per meter) and μ_0 = 4π × 10^-7 T·m/A.
- Faraday's Law of Induction: Induced EMF ε = -N * (ΔΦ_B / Δt), where magnetic flux Φ_B = B * A * cos(θ) (unit: Weber, Wb).
- Lenz's Law: The induced current creates a magnetic field that opposes the change in magnetic flux that produced it.
- Motors convert electrical energy to mechanical torque; generators convert mechanical rotation into alternating or direct EMF.`,
  },
];
