import React from 'react';
import type { PhysicsCourse } from '../../types';

export interface SceneComponentProps {
  playing: boolean;
  resetToken: number;
  onRegisterReset?: (fn: () => void) => void;
}

export interface VisualizerSceneMeta {
  id: string;
  course: PhysicsCourse;
  topic: string;
  title: string;
  subtitle: string;
  formulas: string[];
  loader: () => Promise<{ default: React.ComponentType<SceneComponentProps> }>;
}

export const VISUALIZER_SCENES: VisualizerSceneMeta[] = [
  // ================= PHYSICS 1 =================
  {
    id: 'p1-projectile',
    course: 'Physics 1',
    topic: 'Kinematics',
    title: 'Projectile Motion',
    subtitle: '2D parabolic trajectory, range, and maximum height',
    formulas: [
      '$v_x = v_0\\cos\\theta,\\quad v_y(t) = v_0\\sin\\theta - gt$',
      '$R = \\dfrac{v_0^2\\sin(2\\theta)}{g},\\quad H_{\\max} = \\dfrac{(v_0\\sin\\theta)^2}{2g}$',
    ],
    loader: () => import('./scenes/p1/ProjectileScene'),
  },
  {
    id: 'p1-incline',
    course: 'Physics 1',
    topic: 'Newton’s Laws & Friction',
    title: 'Inclined Plane & Crate',
    subtitle: 'Gravity components, normal force, and kinetic friction',
    formulas: [
      '$F_{\\parallel} = mg\\sin\\theta,\\quad N = mg\\cos\\theta$',
      '$f_k = \\mu_k N,\\quad a = g(\\sin\\theta - \\mu_k\\cos\\theta)$',
    ],
    loader: () => import('./scenes/p1/InclinedPlaneScene'),
  },
  {
    id: 'p1-freefall',
    course: 'Physics 1',
    topic: 'Kinematics',
    title: 'Free Fall',
    subtitle: 'Constant gravitational acceleration and velocity growth',
    formulas: [
      '$y(t) = h_0 - \\tfrac{1}{2}gt^2,\\quad v(t) = -gt$',
      '$t_{\\text{impact}} = \\sqrt{\\dfrac{2h_0}{g}},\\quad v_{\\text{impact}} = \\sqrt{2gh_0}$',
    ],
    loader: () => import('./scenes/p1/FreeFallScene'),
  },
  {
    id: 'p1-pendulum',
    course: 'Physics 1',
    topic: 'Oscillations (SHM)',
    title: 'Simple Pendulum & SHM',
    subtitle: 'Restoring torque, period, and kinetic-potential energy swap',
    formulas: [
      '$T = 2\\pi\\sqrt{\\dfrac{L}{g}},\\quad \\omega = \\sqrt{\\dfrac{g}{L}}$',
      '$\\theta(t) \\approx \\theta_0\\cos(\\omega t),\\quad E_{\\text{total}} = mgL(1 - \\cos\\theta_0)$',
    ],
    loader: () => import('./scenes/p1/PendulumScene'),
  },
  {
    id: 'p1-collisions',
    course: 'Physics 1',
    topic: 'Momentum & Impulse',
    title: '1D Elastic & Inelastic Collisions',
    subtitle: 'Conservation of linear momentum and kinetic energy',
    formulas: [
      '$p_{\\text{total}} = m_1 v_1 + m_2 v_2 = \\text{constant}$',
      '$v_1\' = \\dfrac{(m_1-m_2)v_1 + 2m_2 v_2}{m_1+m_2},\\quad v_{\\text{inelastic}}\' = \\dfrac{p_{\\text{total}}}{m_1+m_2}$',
    ],
    loader: () => import('./scenes/p1/CollisionsScene'),
  },
  {
    id: 'p1-circular',
    course: 'Physics 1',
    topic: 'Circular Motion',
    title: 'Uniform Circular Motion',
    subtitle: 'Tangential velocity, centripetal acceleration, and tension',
    formulas: [
      '$a_c = \\dfrac{v^2}{r} = \\omega^2 r$',
      '$F_c = \\dfrac{mv^2}{r}\\;(\\text{directed toward center})$',
    ],
    loader: () => import('./scenes/p1/CircularMotionScene'),
  },
  {
    id: 'p1-torque',
    course: 'Physics 1',
    topic: 'Rotational Mechanics',
    title: 'Rotational Motion & Torque',
    subtitle: 'Lever arm, force angle, angular acceleration, and inertia',
    formulas: [
      '$\\tau = rF\\sin\\theta,\\quad I = \\tfrac{1}{2}MR^2\\;(\\text{solid disk})$',
      '$\\alpha = \\dfrac{\\tau}{I},\\quad \\omega(t) = \\alpha t$',
    ],
    loader: () => import('./scenes/p1/TorqueScene'),
  },

  // ================= PHYSICS 2 =================
  {
    id: 'p2-orbit',
    course: 'Physics 2',
    topic: 'Universal Gravitation',
    title: 'Satellite Orbit',
    subtitle: 'Gravitational pull balancing centripetal orbital speed',
    formulas: [
      '$F_g = \\dfrac{GMm}{r^2}$',
      '$v_{\\text{orbit}} = \\sqrt{\\dfrac{GM}{r}},\\quad T = 2\\pi\\sqrt{\\dfrac{r^3}{GM}}$',
    ],
    loader: () => import('./scenes/p2/OrbitScene'),
  },
  {
    id: 'p2-buoyancy',
    course: 'Physics 2',
    topic: 'Fluid Statics',
    title: 'Buoyancy & Archimedes’ Principle',
    subtitle: 'Displaced fluid weight versus object weight',
    formulas: [
      '$F_B = \\rho_{\\text{fluid}} V_{\\text{sub}} g,\\quad W = \\rho_{\\text{obj}} V_{\\text{obj}} g$',
      '$F_{\\text{net}} = F_B - W\\;(\\text{floats when } \\rho_{\\text{obj}} < \\rho_{\\text{fluid}})$',
    ],
    loader: () => import('./scenes/p2/BuoyancyScene'),
  },
  {
    id: 'p2-hydraulics',
    course: 'Physics 2',
    topic: 'Fluid Statics',
    title: 'Hydraulic Lift (Pascal’s Principle)',
    subtitle: 'Uniform fluid pressure multiplying output force',
    formulas: [
      '$P = \\dfrac{F_1}{A_1} = \\dfrac{F_2}{A_2}$',
      '$F_2 = F_1\\left(\\dfrac{A_2}{A_1}\\right),\\quad A_1 d_1 = A_2 d_2$',
    ],
    loader: () => import('./scenes/p2/HydraulicScene'),
  },
  {
    id: 'p2-bernoulli',
    course: 'Physics 2',
    topic: 'Fluid Dynamics',
    title: 'Fluid Flow: Continuity & Bernoulli',
    subtitle: 'Pipe constriction speeds up flow and lowers pressure',
    formulas: [
      '$A_1 v_1 = A_2 v_2\\;(\\text{Continuity})$',
      '$P_1 + \\tfrac{1}{2}\\rho v_1^2 = P_2 + \\tfrac{1}{2}\\rho v_2^2\\;(\\text{Bernoulli, level pipe})$',
    ],
    loader: () => import('./scenes/p2/BernoulliScene'),
  },
  {
    id: 'p2-thermal',
    course: 'Physics 2',
    topic: 'Thermal Physics',
    title: 'Heat Transfer & Thermal Expansion',
    subtitle: 'Linear metal rod expansion and conduction rate',
    formulas: [
      '$\\Delta L = \\alpha L_0\\Delta T,\\quad L = L_0(1 + \\alpha\\Delta T)$',
      '$H = \\dfrac{Q}{t} = \\dfrac{kA\\Delta T}{L}$',
    ],
    loader: () => import('./scenes/p2/ThermalExpansionScene'),
  },
  {
    id: 'p2-thermo',
    course: 'Physics 2',
    topic: 'Thermodynamics',
    title: 'Thermodynamic Cycle (Piston & PV)',
    subtitle: '4-step gas cycle linking piston volume and PV work',
    formulas: [
      '$PV = nRT,\\quad \\Delta U = Q - W$',
      '$W_{\\text{cycle}} = \\oint P\\,dV\\;(\\text{area inside } PV\\text{ loop})$',
    ],
    loader: () => import('./scenes/p2/ThermoCycleScene'),
  },

  // ================= PHYSICS 3 =================
  {
    id: 'p3-coulomb',
    course: 'Physics 3',
    topic: 'Electrostatics',
    title: 'Electric Charges & Field Lines',
    subtitle: 'Coulomb force magnitude and electric field vectors',
    formulas: [
      '$F = \\dfrac{k|q_1 q_2|}{r^2}\\;(k = 8.99\\times 10^9\\text{ N}\\cdot\\text{m}^2/\\text{C}^2)$',
      '$E = \\dfrac{k|q|}{r^2}\\;(\\text{in N/C})$',
    ],
    loader: () => import('./scenes/p3/CoulombScene'),
  },
  {
    id: 'p3-circuits',
    course: 'Physics 3',
    topic: 'DC Circuits',
    title: 'Series & Parallel DC Circuits',
    subtitle: 'Ohm’s law, equivalent resistance, and live bulb power',
    formulas: [
      '$I = \\dfrac{V}{R_{\\text{eq}}},\\quad P = VI = I^2 R$',
      '$R_{\\text{series}} = R_1 + R_2,\\quad \\dfrac{1}{R_{\\text{parallel}}} = \\dfrac{1}{R_1} + \\dfrac{1}{R_2}$',
    ],
    loader: () => import('./scenes/p3/CircuitsScene'),
  },
  {
    id: 'p3-magfield',
    course: 'Physics 3',
    topic: 'Magnetostatics',
    title: 'Magnetic Field: Wire & Solenoid',
    subtitle: 'Right-hand rule rings around a wire and uniform solenoid core',
    formulas: [
      '$B_{\\text{wire}} = \\dfrac{\\mu_0 I}{2\\pi r}$',
      '$B_{\\text{solenoid}} = \\mu_0\\left(\\dfrac{N}{L}\\right)I\\;(\\mu_0 = 4\\pi\\times 10^{-7}\\text{ T}\\cdot\\text{m/A})$',
    ],
    loader: () => import('./scenes/p3/MagneticFieldScene'),
  },
  {
    id: 'p3-induction',
    course: 'Physics 3',
    topic: 'Electromagnetic Induction',
    title: 'Faraday’s & Lenz’s Laws',
    subtitle: 'Moving magnet changing magnetic flux induces opposing EMF',
    formulas: [
      '$\\Phi_B = BA\\cos\\theta$',
      '$\\varepsilon = -N\\dfrac{\\Delta\\Phi_B}{\\Delta t}\\;(\\text{opposes flux change})$',
    ],
    loader: () => import('./scenes/p3/InductionScene'),
  },
  {
    id: 'p3-motorgen',
    course: 'Physics 3',
    topic: 'Electromagnetic Devices',
    title: 'Simple DC Motor & AC Generator',
    subtitle: 'Lorentz torque on current loop vs. rotating flux EMF',
    formulas: [
      '$\\tau_{\\text{motor}} = NIAB\\sin\\theta$',
      '$\\varepsilon(t) = NBA\\omega\\sin(\\omega t)$',
    ],
    loader: () => import('./scenes/p3/MotorGeneratorScene'),
  },
];

export const COURSE_LIST: PhysicsCourse[] = ['Physics 1', 'Physics 2', 'Physics 3'];
