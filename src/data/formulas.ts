import { ALL_LESSONS } from './lessons';
import type { BuiltInLesson, PhysicsCourse } from '../types';

export interface FormulaTopicDefinition {
  id: string;
  course: PhysicsCourse;
  title: string;
  subtitle: string;
  lessonIds: string[];
}

export interface FormulaEntry {
  lesson: BuiltInLesson;
  topicId: string;
  topicTitle: string;
  /** Short plain-language symbol/variable guide for quick scanning */
  variables: string;
  /** Extra searchable keywords (symbols, Greek names, equation names) */
  keywords: string;
}

export interface FormulaTopicGroup {
  id: string;
  course: PhysicsCourse;
  title: string;
  subtitle: string;
  entries: FormulaEntry[];
}

export interface PhysicsConstantItem {
  symbol: string;
  name: string;
  valueTex: string;
  copyText: string;
}

export const PHYSICS_CONSTANTS: PhysicsConstantItem[] = [
  {
    symbol: '$g$',
    name: 'Standard gravity (Earth surface)',
    valueTex: '$9.81\\text{ m/s}^2$',
    copyText: 'g = 9.81 m/s^2',
  },
  {
    symbol: '$G$',
    name: 'Universal gravitational constant',
    valueTex: '$6.674 \\times 10^{-11}\\text{ N}\\cdot\\text{m}^2/\\text{kg}^2$',
    copyText: 'G = 6.674e-11 N*m^2/kg^2',
  },
  {
    symbol: '$c$',
    name: 'Speed of light in vacuum',
    valueTex: '$3.00 \\times 10^8\\text{ m/s}$',
    copyText: 'c = 3.00e8 m/s',
  },
  {
    symbol: '$e$',
    name: 'Elementary charge',
    valueTex: '$1.602 \\times 10^{-19}\\text{ C}$',
    copyText: 'e = 1.602e-19 C',
  },
  {
    symbol: '$k$',
    name: 'Coulomb electrostatic constant',
    valueTex: '$8.99 \\times 10^9\\text{ N}\\cdot\\text{m}^2/\\text{C}^2$',
    copyText: 'k = 8.99e9 N*m^2/C^2',
  },
  {
    symbol: '$\\varepsilon_0$',
    name: 'Vacuum permittivity',
    valueTex: '$8.854 \\times 10^{-12}\\text{ C}^2/(\\text{N}\\cdot\\text{m}^2)$',
    copyText: 'epsilon_0 = 8.854e-12 C^2/(N*m^2)',
  },
  {
    symbol: '$\\mu_0$',
    name: 'Vacuum permeability',
    valueTex: '$4\\pi \\times 10^{-7}\\text{ T}\\cdot\\text{m/A}$',
    copyText: 'mu_0 = 4*pi*1e-7 T*m/A',
  },
  {
    symbol: '$R$',
    name: 'Ideal gas constant',
    valueTex: '$8.314\\text{ J/(mol}\\cdot\\text{K)}$',
    copyText: 'R = 8.314 J/(mol*K)',
  },
];

export const FORMULA_TOPICS: FormulaTopicDefinition[] = [
  // Physics 1
  {
    id: 'p1-units-vectors',
    course: 'Physics 1',
    title: 'Units, Measurement & Vectors',
    subtitle: 'SI dimensions, uncertainty analysis, and 2D vector resolution',
    lessonIds: ['1.1', '1.3', '1.4', '2.3'],
  },
  {
    id: 'p1-kinematics',
    course: 'Physics 1',
    title: '1D & 2D Kinematics',
    subtitle: 'Motion graphs, UAM equations, projectiles, and relative velocity',
    lessonIds: ['1.2', '1.5', '1.6', '1.7', '1.8', '1.10', '1.11'],
  },
  {
    id: 'p1-forces',
    course: 'Physics 1',
    title: "Forces & Newton's Laws",
    subtitle: 'Net force, weight, static/kinetic friction, and action-reaction',
    lessonIds: ['2.1', '2.2', '2.4'],
  },
  {
    id: 'p1-energy-momentum',
    course: 'Physics 1',
    title: 'Work, Energy & Momentum',
    subtitle: 'Mechanical work, power, energy conservation, impulse, and collisions',
    lessonIds: ['2.5', '2.6', '2.7'],
  },
  {
    id: 'p1-rotation',
    course: 'Physics 1',
    title: 'Circular & Rotational Dynamics',
    subtitle: 'Centripetal acceleration, torque, moment of inertia, and angular momentum',
    lessonIds: ['1.9', '2.8', '2.9', '2.10', '2.11'],
  },
  {
    id: 'p1-oscillations',
    course: 'Physics 1',
    title: 'Oscillations & Simple Harmonic Motion',
    subtitle: 'Period, frequency, Hooke’s law springs, pendulums, and SHM waves',
    lessonIds: ['2.12', '2.13', '2.14'],
  },

  // Physics 2
  {
    id: 'p2-gravitation',
    course: 'Physics 2',
    title: 'Universal Gravitation & Orbits',
    subtitle: 'Gravitational attraction, orbital speed, potential energy, and escape speed',
    lessonIds: ['3.1', '3.2'],
  },
  {
    id: 'p2-fluid-statics',
    course: 'Physics 2',
    title: 'Fluid Statics & Buoyancy',
    subtitle: 'Density, hydrostatic pressure, Pascal’s hydraulics, and Archimedes’ principle',
    lessonIds: ['3.3', '3.4', '3.5', '3.6'],
  },
  {
    id: 'p2-fluid-dynamics',
    course: 'Physics 2',
    title: 'Fluid Dynamics & Bernoulli',
    subtitle: 'Volume flow rate, continuity equation, and Bernoulli energy balance',
    lessonIds: ['3.7', '3.8', '3.9'],
  },
  {
    id: 'p2-heat-expansion',
    course: 'Physics 2',
    title: 'Heat, Temperature & Thermal Expansion',
    subtitle: 'Conduction, temperature scales, calorimetry, latent heat, and expansion',
    lessonIds: ['3.10', '3.11', '3.12', '3.13', '3.14'],
  },
  {
    id: 'p2-thermodynamics',
    course: 'Physics 2',
    title: 'Thermodynamics, Engines & Refrigeration',
    subtitle: 'Zeroth/First/Second laws, PV processes, Carnot efficiency, and heat pumps',
    lessonIds: ['3.15', '3.16', '3.17', '3.18', '3.19', '3.20', '3.21', '3.22'],
  },

  // Physics 3
  {
    id: 'p3-electrostatics',
    course: 'Physics 3',
    title: 'Electrostatics & Electric Fields',
    subtitle: 'Charge quantization, Coulomb’s law, electric field, and electric potential',
    lessonIds: ['p3-1', 'p3-2', 'p3-3', 'p3-4', 'p3-5'],
  },
  {
    id: 'p3-circuits',
    course: 'Physics 3',
    title: 'DC Circuits & Capacitance',
    subtitle: 'Ohm’s law, series/parallel resistors & capacitors, resistivity, and power',
    lessonIds: ['p3-6', 'p3-7', 'p3-8', 'p3-9'],
  },
  {
    id: 'p3-magnetism',
    course: 'Physics 3',
    title: 'Magnetism & Magnetic Forces',
    subtitle: 'Magnetic domains, Earth’s field, Lorentz force, wires, and solenoids',
    lessonIds: ['p3-10', 'p3-11', 'p3-12', 'p3-13'],
  },
  {
    id: 'p3-induction-ac',
    course: 'Physics 3',
    title: 'Electromagnetic Induction, AC & Transformers',
    subtitle: 'Magnetic flux, Faraday’s & Lenz’s laws, RMS AC voltage, and transformers',
    lessonIds: ['p3-14', 'p3-15', 'p3-16', 'p3-17', 'p3-18', 'p3-19'],
  },
];

const LESSON_VARIABLE_NOTES: Record<string, { variables: string; keywords: string }> = {
  '1.1': { variables: 'E: energy (J), m: mass (kg), c: speed of light, v: speed (m/s)', keywords: 'relativity einstein speed velocity' },
  '1.2': { variables: 'r(t): position vector, x(t), y(t): coordinates, Δx: displacement, Δt: time interval', keywords: 'unit vectors i j translational motion' },
  '1.3': { variables: '[F]: dimensions of force; 1 N = 1 kg·m/s²', keywords: 'dimensional analysis si base units newton' },
  '1.4': { variables: 'x̄: mean value, Δx: absolute uncertainty', keywords: 'precision accuracy percent error' },
  '1.5': { variables: 'x_i, x_f: initial/final position, v_avg: average velocity, a_avg: acceleration', keywords: '1d kinematics displacement' },
  '1.6': { variables: 'Slope of x-t gives velocity; slope of v-t gives acceleration; area under v-t gives displacement', keywords: 'graphs slope area' },
  '1.7': { variables: 'v_i, v_f: initial/final velocity, a: constant acceleration, t: time, Δx: displacement', keywords: 'suvat uam kinematic equations' },
  '1.8': { variables: 'v_0: launch speed, θ: launch angle, R: horizontal range, H_max: peak height, g = 9.81 m/s²', keywords: 'projectile parabola trajectory range' },
  '1.9': { variables: 'r: radius, T: period, ω: angular speed, a_c: centripetal acceleration, F_c: centripetal force', keywords: 'circular centripetal speed' },
  '1.10': { variables: 'v_A/C: velocity of A relative to frame C', keywords: 'reference frames relative velocity' },
  '1.11': { variables: 'Combines UAM (Δx), projectile range (R), and centripetal acceleration (a_c)', keywords: 'kinematics synthesis problem solving' },

  '2.1': { variables: 'F_net: vector sum of all external forces acting on the object (N)', keywords: 'free body diagram net force superposition' },
  '2.2': { variables: 'W: weight (N), N: normal force (N), μ_k, μ_s: kinetic & static friction coefficients', keywords: 'gravity friction normal force' },
  '2.3': { variables: 'R_x, R_y: perpendicular components, R: resultant magnitude, θ: direction angle', keywords: 'pythagorean components trigonometry' },
  '2.4': { variables: 'm: mass (kg), a: acceleration (m/s²); action-reaction pair forces are equal & opposite', keywords: 'newton second third law inertia' },
  '2.5': { variables: 'F: force (N), d: displacement (m), θ: angle between F and d, P: power (W)', keywords: 'work joules watts power' },
  '2.6': { variables: 'K: kinetic energy, U_g: gravitational potential energy, W_nc: non-conservative work', keywords: 'conservation energy mechanical' },
  '2.7': { variables: 'p: momentum (kg·m/s), J: impulse (N·s), Δt: collision duration', keywords: 'impulse momentum collision conservation' },
  '2.8': { variables: 'ω: angular velocity (rad/s), α: angular acceleration (rad/s²), r: radius', keywords: 'rotational kinematics radians tangential' },
  '2.9': { variables: 'τ: torque (N·m), r: lever arm distance, θ: angle between r and F', keywords: 'torque moment equilibrium lever' },
  '2.10': { variables: 'I: moment of inertia (kg·m²), M, R: disk mass & radius, α: angular acceleration', keywords: 'rotational inertia disk torque' },
  '2.11': { variables: 'L: angular momentum (kg·m²/s), I: rotational inertia, ω: angular speed', keywords: 'angular momentum conservation spin' },
  '2.12': { variables: 'f: frequency (Hz), T: period (s), ω: angular frequency (rad/s)', keywords: 'oscillation cycle frequency period' },
  '2.13': { variables: 'k: spring constant (N/m), x: displacement, m: mass, L: pendulum length', keywords: 'hooke spring pendulum shm' },
  '2.14': { variables: 'A: amplitude, ω: angular frequency, t: time', keywords: 'simple harmonic phase cosine sine' },

  '3.1': { variables: 'G: gravitational constant, m_1, m_2, M: masses, r: center-to-center distance', keywords: 'gravity satellite orbit kepler' },
  '3.2': { variables: 'U_g: gravitational potential energy (negative for bound systems), R: planet radius', keywords: 'escape velocity potential well orbit' },
  '3.3': { variables: 'Fluids (liquids and gases) deform continuously under any applied shear stress', keywords: 'shear viscosity fluid definition' },
  '3.4': { variables: 'ρ: density (kg/m³), P: pressure (Pa), P_0: surface pressure, h: depth (m)', keywords: 'hydrostatic gauge pressure depth' },
  '3.5': { variables: 'F_1, F_2: forces on pistons of areas A_1, A_2 in an enclosed incompressible fluid', keywords: 'pascal hydraulic lift pressure' },
  '3.6': { variables: 'F_B: buoyant force (N), ρ_fluid: fluid density, V_sub: submerged volume (m³)', keywords: 'archimedes buoyancy floating' },
  '3.7': { variables: 'Q: volume flow rate (m³/s), A: cross-sectional area (m²), v: flow speed (m/s)', keywords: 'continuity flow rate laminar' },
  '3.8': { variables: 'P: static pressure, ½ρv²: dynamic pressure, ρgy: hydrostatic pressure term', keywords: 'bernoulli venturi lift fluid energy' },
  '3.9': { variables: 'Core fluid problem toolkit: hydrostatic depth, buoyancy, and continuity', keywords: 'fluids problem solving' },
  '3.10': { variables: 'H: heat transfer rate (W), k: thermal conductivity, A: area, ΔT: temp difference, L: thickness', keywords: 'conduction convection radiation fourier' },
  '3.11': { variables: 'T_K: Kelvin, T_C: Celsius (°C), T_F: Fahrenheit (°F)', keywords: 'kelvin celsius fahrenheit thermometer' },
  '3.12': { variables: 'Sum of all heat exchanges inside an insulated system equals zero', keywords: 'calorimetry thermal equilibrium mixing' },
  '3.13': { variables: 'c: specific heat capacity (J/kg·K), L: latent heat of fusion or vaporization (J/kg)', keywords: 'phase change specific heat latent' },
  '3.14': { variables: 'α: linear expansion coefficient, β ≈ 3α: volume expansion coefficient', keywords: 'thermal expansion length volume' },
  '3.15': { variables: 'Two systems in thermal equilibrium with a third system share the same temperature', keywords: 'zeroth law thermal equilibrium' },
  '3.16': { variables: 'ΔU: change in internal energy, Q: heat added, W: work done by the system', keywords: 'first law internal energy pv diagram' },
  '3.17': { variables: 'S: entropy (J/K), Q_rev: reversible heat transfer, T: absolute temperature (K)', keywords: 'second law entropy disorder' },
  '3.18': { variables: 'Isobaric (constant P), Isochoric (constant V, W=0), Adiabatic (no heat exchange, Q=0)', keywords: 'isothermal isobaric isochoric adiabatic' },
  '3.19': { variables: 'Q_H, Q_C: hot/cold heat reservoirs, e: thermal efficiency, T_C, T_H in Kelvin', keywords: 'carnot heat engine efficiency cycle' },
  '3.20': { variables: 'Real heat engines always achieve lower efficiency than the ideal Carnot limit', keywords: 'friction irreversible engine efficiency' },
  '3.21': { variables: 'COP_ref: coefficient of performance, Q_C: heat removed from cold space, W: work input', keywords: 'refrigerator heat pump cop cooling' },
  '3.22': { variables: 'η_cogen: combined electrical + useful thermal output efficiency relative to fuel input', keywords: 'cogeneration chp sustainable energy' },

  'p3-1': { variables: 'q: net charge (C), n: integer excess/deficit electrons, e = 1.602 × 10⁻¹⁹ C', keywords: 'charge quantization electron proton' },
  'p3-2': { variables: 'k = 8.99 × 10⁹ N·m²/C², q_1, q_2: charges (C), r: separation distance (m)', keywords: 'coulomb electrostatic force inverse square' },
  'p3-3': { variables: 'E: electric field strength (N/C or V/m), q_0: positive test charge', keywords: 'electric field point charge vector' },
  'p3-4': { variables: 'q: particle charge, E: uniform electric field, m: particle mass, a: acceleration', keywords: 'uniform electric field parallel plates' },
  'p3-5': { variables: 'V: electric potential (V = J/C), U_E: electric potential energy (J), ΔV: voltage', keywords: 'voltage potential difference work' },
  'p3-6': { variables: 'V: voltage (V), I: current (A), R: resistance (Ω)', keywords: 'ohm law series parallel resistors' },
  'p3-7': { variables: 'C: capacitance (F), κ: dielectric constant, ε_0: permittivity, A: area, d: separation', keywords: 'capacitor dielectric parallel plate' },
  'p3-8': { variables: 'Capacitors in series add reciprocally; capacitors in parallel add directly', keywords: 'capacitor combination equivalent' },
  'p3-9': { variables: 'ρ: resistivity (Ω·m), L: length, A: cross-sectional area, P: electric power (W)', keywords: 'resistivity power joule heating circuit' },
  'p3-10': { variables: 'B_net: total magnetic field combining external field B_0 and aligned domains', keywords: 'ferromagnetism domains magnet' },
  'p3-11': { variables: 'Typical geomagnetic flux density at Earth’s surface is 25–65 μT', keywords: 'earth magnetic field compass tesla' },
  'p3-12': { variables: 'v: charge speed, L: wire length in field, B: magnetic field (T), θ: angle to B', keywords: 'lorentz right hand rule magnetic force' },
  'p3-13': { variables: 'μ_0: vacuum permeability, I: current, r: distance from wire, n = N/L: turns per meter', keywords: 'ampere solenoid wire magnetic field' },
  'p3-14': { variables: 'Φ_B: magnetic flux (Wb), N: number of coil turns, ℰ: induced EMF (V)', keywords: 'faraday flux induction emf' },
  'p3-15': { variables: 'Negative sign shows induced current opposes the change in magnetic flux', keywords: 'lenz law conservation opposition' },
  'p3-16': { variables: '|ℰ|: magnitude of induced EMF, R: total circuit resistance, I_induced: current', keywords: 'induced current faraday calculation' },
  'p3-17': { variables: 'V_max: peak AC voltage, f: frequency (Hz), V_rms: root-mean-square voltage', keywords: 'alternating current rms sine wave' },
  'p3-18': { variables: 'V_p, V_s: primary/secondary voltages, N_p, N_s: coil turns, I_p, I_s: currents', keywords: 'transformer motor generator turns ratio' },
  'p3-19': { variables: 'Eddy currents induced in conductors oppose motion proportionally to speed v', keywords: 'eddy currents induction braking' },
};

const LESSON_MAP = new Map<string, BuiltInLesson>(
  ALL_LESSONS.map((lesson) => [lesson.id, lesson])
);

export const FORMULA_TOPIC_GROUPS: FormulaTopicGroup[] = FORMULA_TOPICS.map((topic) => {
  const entries: FormulaEntry[] = topic.lessonIds
    .map((id) => LESSON_MAP.get(id))
    .filter((lesson): lesson is BuiltInLesson => Boolean(lesson))
    .map((lesson) => {
      const note = LESSON_VARIABLE_NOTES[lesson.id];
      return {
        lesson,
        topicId: topic.id,
        topicTitle: topic.title,
        variables: note?.variables || lesson.objective,
        keywords: note?.keywords || '',
      };
    });

  return {
    id: topic.id,
    course: topic.course,
    title: topic.title,
    subtitle: topic.subtitle,
    entries,
  };
});

/** Strip display/inline dollar delimiters for clean clipboard copying */
export function formatFormulaForClipboard(entry: FormulaEntry): string {
  const cleaned = entry.lesson.keyFormula
    .replace(/^\$\$\s*|\s*\$\$$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `${entry.lesson.code} ${entry.lesson.title}: ${cleaned}`;
}
