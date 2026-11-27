import type { PhysicsCourse } from '../../types';

export interface SceneParamOption {
  value: string;
  label: string;
}

export interface SceneParamSpec {
  key: string;
  label: string;
  unit?: string;
  type: 'number' | 'select';
  min?: number;
  max?: number;
  customMin?: number;
  customMax?: number;
  step?: number;
  defaultValue: number | string;
  options?: SceneParamOption[];
  placeholderHint?: string;
}

export interface BuiltInRealScenario {
  id: string;
  sceneId: string;
  title: string;
  summary: string;
  params: Record<string, number | string>;
}

export interface SceneScenarioSchema {
  sceneId: string;
  course: PhysicsCourse;
  keywords: string[];
  params: SceneParamSpec[];
  realScenarios: BuiltInRealScenario[];
}

export const SCENE_SCENARIO_SCHEMAS: Record<string, SceneScenarioSchema> = {
  'p1-projectile': {
    sceneId: 'p1-projectile',
    course: 'Physics 1',
    keywords: [
      'projectile',
      'launch',
      'throw',
      'kick',
      'cannon',
      'ball',
      'basketball',
      'soccer',
      'football',
      'volleyball',
      'takraw',
      'arrow',
      'golf',
      'trajectory',
      'range',
      'fired',
    ],
    params: [
      {
        key: 'angle',
        label: 'Launch Angle',
        unit: '°',
        type: 'number',
        min: 15,
        max: 80,
        customMin: 5,
        customMax: 88,
        step: 1,
        defaultValue: 45,
      },
      {
        key: 'speed',
        label: 'Initial Speed',
        unit: 'm/s',
        type: 'number',
        min: 5,
        max: 25,
        customMin: 1,
        customMax: 150,
        step: 0.5,
        defaultValue: 14,
      },
      {
        key: 'gravity',
        label: 'Gravity',
        unit: 'm/s²',
        type: 'number',
        min: 1.6,
        max: 20,
        customMin: 0.5,
        customMax: 30,
        step: 0.05,
        defaultValue: 9.81,
      },
    ],
    realScenarios: [
      {
        id: 'proj-bball',
        sceneId: 'p1-projectile',
        title: 'Basketball 3-Point Arc',
        summary: 'Shot released at 52° with 8.5 m/s speed on Earth gravity.',
        params: { angle: 52, speed: 8.5, gravity: 9.81 },
      },
      {
        id: 'proj-soccer',
        sceneId: 'p1-projectile',
        title: 'Soccer Free Kick',
        summary: 'Long free kick struck at 28° and 26 m/s (≈ 94 km/h).',
        params: { angle: 28, speed: 26, gravity: 9.81 },
      },
      {
        id: 'proj-firehose',
        sceneId: 'p1-projectile',
        title: 'Firehose Water Jet',
        summary: 'High-pressure water stream aimed at 45° and 32 m/s.',
        params: { angle: 45, speed: 32, gravity: 9.81 },
      },
      {
        id: 'proj-moon',
        sceneId: 'p1-projectile',
        title: 'Moon Golf Drive',
        summary: 'Golf ball launched at 45° and 18 m/s under lunar gravity (1.62 m/s²).',
        params: { angle: 45, speed: 18, gravity: 1.62 },
      },
    ],
  },

  'p1-incline': {
    sceneId: 'p1-incline',
    course: 'Physics 1',
    keywords: [
      'ramp',
      'incline',
      'inclined plane',
      'slope',
      'hill',
      'slide',
      'sliding',
      'crate',
      'box',
      'friction',
      'mu',
      'normal force',
      'ski',
      'driveway',
    ],
    params: [
      {
        key: 'angle',
        label: 'Ramp Angle',
        unit: '°',
        type: 'number',
        min: 10,
        max: 50,
        customMin: 2,
        customMax: 75,
        step: 1,
        defaultValue: 30,
      },
      {
        key: 'mu',
        label: 'Friction Coeff (μ_k)',
        unit: '',
        type: 'number',
        min: 0,
        max: 0.8,
        customMin: 0,
        customMax: 1.5,
        step: 0.01,
        defaultValue: 0.2,
      },
      {
        key: 'mass',
        label: 'Object Mass',
        unit: 'kg',
        type: 'number',
        min: 1,
        max: 20,
        customMin: 0.1,
        customMax: 5000,
        step: 0.5,
        defaultValue: 5,
      },
    ],
    realScenarios: [
      {
        id: 'inc-truck',
        sceneId: 'p1-incline',
        title: 'Delivery Ramp Unload',
        summary: '45 kg cargo box sliding down a 24° steel ramp (μ = 0.25).',
        params: { angle: 24, mu: 0.25, mass: 45 },
      },
      {
        id: 'inc-ski',
        sceneId: 'p1-incline',
        title: 'Ski Slope Glide',
        summary: '70 kg skier descending an icy 18° slope (μ = 0.05).',
        params: { angle: 18, mu: 0.05, mass: 70 },
      },
      {
        id: 'inc-roof',
        sceneId: 'p1-incline',
        title: 'Roof Shingle Static Hold',
        summary: '12 kg tool bag resting on a 22° rough roof (μ = 0.55) — friction holds.',
        params: { angle: 22, mu: 0.55, mass: 12 },
      },
    ],
  },

  'p1-freefall': {
    sceneId: 'p1-freefall',
    course: 'Physics 1',
    keywords: [
      'free fall',
      'freefall',
      'drop',
      'dropped',
      'fall',
      'falling',
      'cliff',
      'building',
      'tower',
      'coconut',
      'bridge',
      'balcony',
      'roof',
      'height',
    ],
    params: [
      {
        key: 'height',
        label: 'Drop Height',
        unit: 'm',
        type: 'number',
        min: 4,
        max: 25,
        customMin: 0.5,
        customMax: 500,
        step: 0.5,
        defaultValue: 12,
      },
      {
        key: 'gravity',
        label: 'Gravity',
        unit: 'm/s²',
        type: 'number',
        min: 1.6,
        max: 24.8,
        customMin: 0.5,
        customMax: 30,
        step: 0.05,
        defaultValue: 9.81,
      },
      {
        key: 'mass',
        label: 'Object Mass',
        unit: 'kg',
        type: 'number',
        min: 0.5,
        max: 10,
        customMin: 0.05,
        customMax: 2000,
        step: 0.25,
        defaultValue: 2,
      },
    ],
    realScenarios: [
      {
        id: 'ff-coconut',
        sceneId: 'p1-freefall',
        title: 'Falling Coconut',
        summary: '1.5 kg coconut dropping from a 15 m palm tree.',
        params: { height: 15, gravity: 9.81, mass: 1.5 },
      },
      {
        id: 'ff-dive',
        sceneId: 'p1-freefall',
        title: '10 m Olympic High Dive',
        summary: '65 kg diver stepping off a 10 m platform.',
        params: { height: 10, gravity: 9.81, mass: 65 },
      },
      {
        id: 'ff-tower',
        sceneId: 'p1-freefall',
        title: '45 m Drop Tower Ride',
        summary: 'Free-fall drop from a 45 m amusement park tower.',
        params: { height: 45, gravity: 9.81, mass: 450 },
      },
      {
        id: 'ff-mars',
        sceneId: 'p1-freefall',
        title: 'Mars Rover Drop Test',
        summary: '180 kg lander dropped from 12 m under Mars gravity (3.72 m/s²).',
        params: { height: 12, gravity: 3.72, mass: 180 },
      },
    ],
  },

  'p1-pendulum': {
    sceneId: 'p1-pendulum',
    course: 'Physics 1',
    keywords: [
      'pendulum',
      'swing',
      'oscillate',
      'oscillation',
      'clock',
      'metronome',
      'wrecking ball',
      'period',
      'bob',
      'string length',
      'shm',
    ],
    params: [
      {
        key: 'length',
        label: 'String Length',
        unit: 'm',
        type: 'number',
        min: 0.8,
        max: 3.4,
        customMin: 0.1,
        customMax: 50,
        step: 0.05,
        defaultValue: 2.2,
      },
      {
        key: 'angle',
        label: 'Release Angle',
        unit: '°',
        type: 'number',
        min: 5,
        max: 45,
        customMin: 1,
        customMax: 60,
        step: 1,
        defaultValue: 25,
      },
      {
        key: 'gravity',
        label: 'Gravity',
        unit: 'm/s²',
        type: 'number',
        min: 1.6,
        max: 20,
        customMin: 0.5,
        customMax: 30,
        step: 0.05,
        defaultValue: 9.81,
      },
    ],
    realScenarios: [
      {
        id: 'pend-clock',
        sceneId: 'p1-pendulum',
        title: 'Grandfather Clock (1 s Beat)',
        summary: '0.994 m pendulum produces a 2.0 s full period (1 s per tick).',
        params: { length: 0.99, angle: 10, gravity: 9.81 },
      },
      {
        id: 'pend-playground',
        sceneId: 'p1-pendulum',
        title: 'Playground Swing',
        summary: '3.2 m chains pulled back to 35° before release.',
        params: { length: 3.2, angle: 35, gravity: 9.81 },
      },
      {
        id: 'pend-foucault',
        sceneId: 'p1-pendulum',
        title: 'Museum Foucault Pendulum',
        summary: '16 m tall suspension cable swinging gently at 8°.',
        params: { length: 16, angle: 8, gravity: 9.81 },
      },
    ],
  },

  'p1-collisions': {
    sceneId: 'p1-collisions',
    course: 'Physics 1',
    keywords: [
      'collision',
      'collide',
      'crash',
      'hit',
      'hits',
      'bump',
      'momentum',
      'elastic',
      'inelastic',
      'car',
      'truck',
      'van',
      'billiard',
      'pool ball',
      'train',
      'cart',
    ],
    params: [
      {
        key: 'collisionType',
        label: 'Collision Type',
        type: 'select',
        defaultValue: 'elastic',
        options: [
          { value: 'elastic', label: 'Elastic (KE Conserved)' },
          { value: 'inelastic', label: 'Completely Inelastic (Stick)' },
        ],
      },
      {
        key: 'm1',
        label: 'Object 1 Mass',
        unit: 'kg',
        type: 'number',
        min: 1,
        max: 10,
        customMin: 0.1,
        customMax: 20000,
        step: 0.5,
        defaultValue: 4,
      },
      {
        key: 'm2',
        label: 'Object 2 Mass',
        unit: 'kg',
        type: 'number',
        min: 1,
        max: 10,
        customMin: 0.1,
        customMax: 20000,
        step: 0.5,
        defaultValue: 2,
      },
      {
        key: 'v1',
        label: 'Velocity 1',
        unit: 'm/s',
        type: 'number',
        min: 1,
        max: 7,
        customMin: -50,
        customMax: 80,
        step: 0.5,
        defaultValue: 4,
      },
      {
        key: 'v2',
        label: 'Velocity 2',
        unit: 'm/s',
        type: 'number',
        min: -7,
        max: 0,
        customMin: -80,
        customMax: 50,
        step: 0.5,
        defaultValue: -3,
      },
    ],
    realScenarios: [
      {
        id: 'col-fender',
        sceneId: 'p1-collisions',
        title: 'Rear-End Bumper Coupling',
        summary: '1200 kg sedan at 14 m/s locks bumpers with a stopped 1800 kg SUV.',
        params: { collisionType: 'inelastic', m1: 1200, m2: 1800, v1: 14, v2: 0 },
      },
      {
        id: 'col-billiard',
        sceneId: 'p1-collisions',
        title: 'Billiard Cue Ball Break',
        summary: 'Equal-mass (0.17 kg) elastic strike transfers nearly all speed.',
        params: { collisionType: 'elastic', m1: 0.17, m2: 0.17, v1: 6, v2: 0 },
      },
      {
        id: 'col-train',
        sceneId: 'p1-collisions',
        title: 'Freight Railcar Coupling',
        summary: '12,000 kg locomotive at 5 m/s couples onto an 8,000 kg car rolling at -1 m/s.',
        params: { collisionType: 'inelastic', m1: 12000, m2: 8000, v1: 5, v2: -1 },
      },
    ],
  },

  'p1-circular': {
    sceneId: 'p1-circular',
    course: 'Physics 1',
    keywords: [
      'circular',
      'centripetal',
      'curve',
      'corner',
      'roundabout',
      'turn',
      'orbiting',
      'carousel',
      'ferris',
      'centrifuge',
      'whirl',
      'loop',
    ],
    params: [
      {
        key: 'radius',
        label: 'Turn / Orbit Radius',
        unit: 'm',
        type: 'number',
        min: 1,
        max: 4,
        customMin: 0.2,
        customMax: 200,
        step: 0.25,
        defaultValue: 2.5,
      },
      {
        key: 'speed',
        label: 'Tangential Speed',
        unit: 'm/s',
        type: 'number',
        min: 1,
        max: 10,
        customMin: 0.2,
        customMax: 100,
        step: 0.5,
        defaultValue: 5,
      },
      {
        key: 'mass',
        label: 'Object Mass',
        unit: 'kg',
        type: 'number',
        min: 0.5,
        max: 6,
        customMin: 0.05,
        customMax: 5000,
        step: 0.5,
        defaultValue: 2,
      },
    ],
    realScenarios: [
      {
        id: 'circ-roundabout',
        sceneId: 'p1-circular',
        title: 'Car Rounding a Curve',
        summary: '1400 kg car navigating a 35 m highway curve at 20 m/s (72 km/h).',
        params: { radius: 35, speed: 20, mass: 1400 },
      },
      {
        id: 'circ-washer',
        sceneId: 'p1-circular',
        title: 'Washing Machine Spin Cycle',
        summary: '0.5 kg wet towel pinned to a 0.25 m drum wall at 12 m/s.',
        params: { radius: 0.25, speed: 12, mass: 0.5 },
      },
      {
        id: 'circ-hammer',
        sceneId: 'p1-circular',
        title: 'Olympic Hammer Throw',
        summary: '7.26 kg hammer spun on a 1.2 m wire at 28 m/s.',
        params: { radius: 1.2, speed: 28, mass: 7.26 },
      },
    ],
  },

  'p1-torque': {
    sceneId: 'p1-torque',
    course: 'Physics 1',
    keywords: [
      'torque',
      'wrench',
      'lever',
      'spanner',
      'bolt',
      'lug nut',
      'door',
      'seesaw',
      'flywheel',
      'rotational',
      'angular acceleration',
    ],
    params: [
      {
        key: 'leverR',
        label: 'Lever Arm (r)',
        unit: 'm',
        type: 'number',
        min: 0.4,
        max: 2.0,
        customMin: 0.05,
        customMax: 10,
        step: 0.05,
        defaultValue: 1.5,
      },
      {
        key: 'force',
        label: 'Applied Force (F)',
        unit: 'N',
        type: 'number',
        min: 5,
        max: 50,
        customMin: 1,
        customMax: 2000,
        step: 1,
        defaultValue: 25,
      },
      {
        key: 'angle',
        label: 'Force Angle',
        unit: '°',
        type: 'number',
        min: 15,
        max: 165,
        customMin: 5,
        customMax: 175,
        step: 5,
        defaultValue: 90,
      },
      {
        key: 'diskMass',
        label: 'Wheel / Disk Mass',
        unit: 'kg',
        type: 'number',
        min: 1,
        max: 10,
        customMin: 0.2,
        customMax: 500,
        step: 0.5,
        defaultValue: 4,
      },
    ],
    realScenarios: [
      {
        id: 'torq-lug',
        sceneId: 'p1-torque',
        title: 'Tire Lug Nut Wrench',
        summary: '0.45 m breaker bar pushed perpendicularly with 280 N force.',
        params: { leverR: 0.45, force: 280, angle: 90, diskMass: 12 },
      },
      {
        id: 'torq-door',
        sceneId: 'p1-torque',
        title: 'Heavy Vault Door Push',
        summary: 'Force of 60 N applied at 0.85 m from the hinge at a 60° angle.',
        params: { leverR: 0.85, force: 60, angle: 60, diskMass: 45 },
      },
      {
        id: 'torq-potter',
        sceneId: 'p1-torque',
        title: 'Pottery Flywheel Kick',
        summary: 'Foot kick of 35 N at 0.35 m rim of an 18 kg flywheel.',
        params: { leverR: 0.35, force: 35, angle: 90, diskMass: 18 },
      },
    ],
  },

  'p2-orbit': {
    sceneId: 'p2-orbit',
    course: 'Physics 2',
    keywords: [
      'orbit',
      'satellite',
      'iss',
      'space station',
      'gps',
      'geostationary',
      'planet',
      'diwata',
      'earth',
      'altitude',
      'gravitation',
      'starlink',
    ],
    params: [
      {
        key: 'radiusRe',
        label: 'Orbital Radius',
        unit: 'R_E',
        type: 'number',
        min: 1.2,
        max: 3.5,
        customMin: 1.03,
        customMax: 10,
        step: 0.05,
        defaultValue: 1.5,
      },
      {
        key: 'planetMassMult',
        label: 'Planet Mass',
        unit: 'M_E',
        type: 'number',
        min: 0.5,
        max: 3.0,
        customMin: 0.01,
        customMax: 50,
        step: 0.05,
        defaultValue: 1.0,
      },
      {
        key: 'satMass',
        label: 'Satellite Mass',
        unit: 'kg',
        type: 'number',
        min: 100,
        max: 2000,
        customMin: 1,
        customMax: 500000,
        step: 10,
        defaultValue: 500,
      },
    ],
    realScenarios: [
      {
        id: 'orb-iss',
        sceneId: 'p2-orbit',
        title: 'ISS (~420 km Altitude)',
        summary: '420,000 kg station orbiting at 1.07 Earth radii every ~93 min.',
        params: { radiusRe: 1.07, planetMassMult: 1.0, satMass: 420000 },
      },
      {
        id: 'orb-diwata',
        sceneId: 'p2-orbit',
        title: 'Diwata-2 Microsatellite (620 km)',
        summary: 'Philippine 50 kg Earth-observation satellite at 1.10 R_E.',
        params: { radiusRe: 1.1, planetMassMult: 1.0, satMass: 50 },
      },
      {
        id: 'orb-gps',
        sceneId: 'p2-orbit',
        title: 'GPS Navigation Ring (20,200 km)',
        summary: '1600 kg satellite at 4.17 Earth radii (~12-hour orbit).',
        params: { radiusRe: 4.17, planetMassMult: 1.0, satMass: 1600 },
      },
      {
        id: 'orb-geo',
        sceneId: 'p2-orbit',
        title: 'Weather Geostationary (35,786 km)',
        summary: '3000 kg weather satellite at 6.61 R_E matching Earth rotation (24 h).',
        params: { radiusRe: 6.61, planetMassMult: 1.0, satMass: 3000 },
      },
    ],
  },

  'p2-buoyancy': {
    sceneId: 'p2-buoyancy',
    course: 'Physics 2',
    keywords: [
      'buoyancy',
      'archimedes',
      'float',
      'sink',
      'submerged',
      'iceberg',
      'ship',
      'boat',
      'anchor',
      'submarine',
      'seawater',
      'density',
    ],
    params: [
      {
        key: 'objDensity',
        label: 'Object Density',
        unit: 'kg/m³',
        type: 'number',
        min: 200,
        max: 2200,
        customMin: 10,
        customMax: 22000,
        step: 25,
        defaultValue: 650,
      },
      {
        key: 'fluidDensity',
        label: 'Fluid Density',
        unit: 'kg/m³',
        type: 'number',
        min: 700,
        max: 1500,
        customMin: 100,
        customMax: 13600,
        step: 25,
        defaultValue: 1000,
      },
      {
        key: 'volume',
        label: 'Object Volume',
        unit: 'm³',
        type: 'number',
        min: 0.1,
        max: 2.0,
        customMin: 0.001,
        customMax: 500,
        step: 0.05,
        defaultValue: 0.5,
      },
    ],
    realScenarios: [
      {
        id: 'buoy-iceberg',
        sceneId: 'p2-buoyancy',
        title: 'Arctic Iceberg in Seawater',
        summary: 'Glacial ice (917 kg/m³) floats with ~89% submerged in ocean water (1025 kg/m³).',
        params: { objDensity: 917, fluidDensity: 1025, volume: 1.8 },
      },
      {
        id: 'buoy-banca',
        sceneId: 'p2-buoyancy',
        title: 'Wooden Outrigger Hull',
        summary: 'Hardwood plank (600 kg/m³) floating high in calm freshwater (1000 kg/m³).',
        params: { objDensity: 600, fluidDensity: 1000, volume: 0.8 },
      },
      {
        id: 'buoy-anchor',
        sceneId: 'p2-buoyancy',
        title: 'Cast-Iron Ship Anchor',
        summary: 'Iron (7850 kg/m³) sinks rapidly in seawater despite buoyant lift.',
        params: { objDensity: 7850, fluidDensity: 1025, volume: 0.15 },
      },
      {
        id: 'buoy-mercury',
        sceneId: 'p2-buoyancy',
        title: 'Steel Block in Liquid Mercury',
        summary: 'Steel (7850 kg/m³) actually floats on liquid mercury (13600 kg/m³)!',
        params: { objDensity: 7850, fluidDensity: 13600, volume: 0.3 },
      },
    ],
  },

  'p2-hydraulics': {
    sceneId: 'p2-hydraulics',
    course: 'Physics 2',
    keywords: [
      'hydraulic',
      'pascal',
      'lift',
      'jack',
      'brake',
      'piston',
      'syringe',
      'press',
      'car lift',
    ],
    params: [
      {
        key: 'f1',
        label: 'Input Force (F_1)',
        unit: 'N',
        type: 'number',
        min: 20,
        max: 400,
        customMin: 1,
        customMax: 5000,
        step: 5,
        defaultValue: 120,
      },
      {
        key: 'a1',
        label: 'Input Area (A_1)',
        unit: 'm²',
        type: 'number',
        min: 0.02,
        max: 0.15,
        customMin: 0.0005,
        customMax: 1.0,
        step: 0.005,
        defaultValue: 0.05,
      },
      {
        key: 'a2',
        label: 'Output Area (A_2)',
        unit: 'm²',
        type: 'number',
        min: 0.2,
        max: 1.0,
        customMin: 0.01,
        customMax: 5.0,
        step: 0.02,
        defaultValue: 0.45,
      },
    ],
    realScenarios: [
      {
        id: 'hyd-garage',
        sceneId: 'p2-hydraulics',
        title: 'Auto Shop Car Lift',
        summary: '300 N pump force on 0.01 m² lifts a 15,000 N SUV on a 0.50 m² ram.',
        params: { f1: 300, a1: 0.01, a2: 0.5 },
      },
      {
        id: 'hyd-dental',
        sceneId: 'p2-hydraulics',
        title: 'Dentist Hydraulic Chair',
        summary: '85 N foot pedal on 0.015 m² comfortably elevates patient on 0.24 m² cylinder.',
        params: { f1: 85, a1: 0.015, a2: 0.24 },
      },
      {
        id: 'hyd-brake',
        sceneId: 'p2-hydraulics',
        title: 'Car Hydraulic Brake Line',
        summary: '180 N pedal force pushed from 0.004 m² master cylinder to 0.036 m² caliper.',
        params: { f1: 180, a1: 0.004, a2: 0.036 },
      },
    ],
  },

  'p2-bernoulli': {
    sceneId: 'p2-bernoulli',
    course: 'Physics 2',
    keywords: [
      'bernoulli',
      'venturi',
      'pipe',
      'nozzle',
      'hose',
      'water main',
      'constriction',
      'flow rate',
      'continuity',
      'carburetor',
    ],
    params: [
      {
        key: 'v1',
        label: 'Inlet Speed (v_1)',
        unit: 'm/s',
        type: 'number',
        min: 0.5,
        max: 4.0,
        customMin: 0.1,
        customMax: 30,
        step: 0.1,
        defaultValue: 2.0,
      },
      {
        key: 'r1',
        label: 'Wide Radius (r_1)',
        unit: 'm',
        type: 'number',
        min: 0.35,
        max: 0.7,
        customMin: 0.01,
        customMax: 3.0,
        step: 0.01,
        defaultValue: 0.5,
      },
      {
        key: 'r2',
        label: 'Throat Radius (r_2)',
        unit: 'm',
        type: 'number',
        min: 0.15,
        max: 0.45,
        customMin: 0.005,
        customMax: 2.5,
        step: 0.01,
        defaultValue: 0.28,
      },
      {
        key: 'density',
        label: 'Fluid Density',
        unit: 'kg/m³',
        type: 'number',
        min: 700,
        max: 1300,
        customMin: 1,
        customMax: 13600,
        step: 25,
        defaultValue: 1000,
      },
    ],
    realScenarios: [
      {
        id: 'bern-hose',
        sceneId: 'p2-bernoulli',
        title: 'Garden Hose Spray Nozzle',
        summary: 'Water enters a 0.015 m hose at 1.4 m/s and jets out a 0.006 m nozzle.',
        params: { v1: 1.4, r1: 0.015, r2: 0.006, density: 1000 },
      },
      {
        id: 'bern-venturi',
        sceneId: 'p2-bernoulli',
        title: 'Water Main Venturi Meter',
        summary: 'Municipal water pipe narrows from 0.40 m to 0.22 m radius at 2.2 m/s.',
        params: { v1: 2.2, r1: 0.4, r2: 0.22, density: 1000 },
      },
      {
        id: 'bern-oil',
        sceneId: 'p2-bernoulli',
        title: 'Crude Oil Pipeline Choke',
        summary: 'Oil (850 kg/m³) accelerates through a 0.60 m → 0.36 m reducer.',
        params: { v1: 1.8, r1: 0.6, r2: 0.36, density: 850 },
      },
    ],
  },

  'p2-thermal': {
    sceneId: 'p2-thermal',
    course: 'Physics 2',
    keywords: [
      'thermal expansion',
      'expand',
      'bridge',
      'railroad',
      'railway',
      'steel',
      'copper',
      'aluminum',
      'heat transfer',
      'conduction',
      'rod',
      'temperature change',
    ],
    params: [
      {
        key: 'deltaT',
        label: 'Temp Change (ΔT)',
        unit: '°C',
        type: 'number',
        min: 0,
        max: 400,
        customMin: 0,
        customMax: 1500,
        step: 5,
        defaultValue: 220,
      },
      {
        key: 'l0',
        label: 'Initial Length (L_0)',
        unit: 'm',
        type: 'number',
        min: 1,
        max: 5,
        customMin: 0.1,
        customMax: 1000,
        step: 0.5,
        defaultValue: 2.5,
      },
      {
        key: 'alphaMicro',
        label: 'Alpha (×10⁻⁶ K⁻¹)',
        unit: 'K⁻¹',
        type: 'number',
        min: 11,
        max: 24,
        customMin: 1,
        customMax: 100,
        step: 0.5,
        defaultValue: 17,
      },
    ],
    realScenarios: [
      {
        id: 'therm-rail',
        sceneId: 'p2-thermal',
        title: 'Summer Steel Railway Track',
        summary: '25 m steel rail (α = 12×10⁻⁶) heating up by 35°C under tropical sun.',
        params: { deltaT: 35, l0: 25, alphaMicro: 12 },
      },
      {
        id: 'therm-bridge',
        sceneId: 'p2-thermal',
        title: 'Steel Bridge Expansion Joint',
        summary: '120 m steel span experiencing a 45°C seasonal swing.',
        params: { deltaT: 45, l0: 120, alphaMicro: 12 },
      },
      {
        id: 'therm-copper',
        sceneId: 'p2-thermal',
        title: 'Copper Hot-Water Pipe',
        summary: '4.5 m copper pipe (α = 17×10⁻⁶) warming from 20°C to 85°C (ΔT = 65°C).',
        params: { deltaT: 65, l0: 4.5, alphaMicro: 17 },
      },
      {
        id: 'therm-wing',
        sceneId: 'p2-thermal',
        title: 'Aluminum Jet Wing Skin',
        summary: '14 m aluminum wing spar (α = 23×10⁻⁶) warming by 75°C.',
        params: { deltaT: 75, l0: 14, alphaMicro: 23 },
      },
    ],
  },

  'p2-thermo': {
    sceneId: 'p2-thermo',
    course: 'Physics 2',
    keywords: [
      'thermodynamic',
      'heat engine',
      'carnot',
      'piston',
      'pv diagram',
      'ideal gas',
      'steam engine',
      'kelvin',
      'moles',
      'efficiency',
      'diesel',
    ],
    params: [
      {
        key: 'tHot',
        label: 'Hot Reservoir (T_H)',
        unit: 'K',
        type: 'number',
        min: 420,
        max: 900,
        customMin: 250,
        customMax: 3000,
        step: 10,
        defaultValue: 600,
      },
      {
        key: 'tCold',
        label: 'Cold Reservoir (T_C)',
        unit: 'K',
        type: 'number',
        min: 200,
        max: 400,
        customMin: 50,
        customMax: 1200,
        step: 10,
        defaultValue: 300,
      },
      {
        key: 'moles',
        label: 'Gas Amount (n)',
        unit: 'mol',
        type: 'number',
        min: 0.5,
        max: 3.0,
        customMin: 0.1,
        customMax: 50,
        step: 0.1,
        defaultValue: 1.5,
      },
    ],
    realScenarios: [
      {
        id: 'pv-steam',
        sceneId: 'p2-thermo',
        title: 'Geothermal Steam Turbine',
        summary: 'Steam cycle between 580 K reservoir and 310 K cooling tower.',
        params: { tHot: 580, tCold: 310, moles: 2.0 },
      },
      {
        id: 'pv-car',
        sceneId: 'p2-thermo',
        title: 'Automotive Combustion Engine',
        summary: 'High-temp 1100 K exhaust peak vs 340 K radiator sink.',
        params: { tHot: 1100, tCold: 340, moles: 1.2 },
      },
      {
        id: 'pv-stirling',
        sceneId: 'p2-thermo',
        title: 'Tabletop Stirling Engine',
        summary: 'Gentle candle flame at 450 K against 295 K room air.',
        params: { tHot: 450, tCold: 295, moles: 0.8 },
      },
    ],
  },

  'p3-coulomb': {
    sceneId: 'p3-coulomb',
    course: 'Physics 3',
    keywords: [
      'coulomb',
      'charge',
      'charges',
      'electric field',
      'static',
      'electrostatic',
      'microcoulomb',
      'proton',
      'lightning',
      'balloon',
    ],
    params: [
      {
        key: 'q1',
        label: 'Charge 1 (q_1)',
        unit: 'μC',
        type: 'number',
        min: -6,
        max: 6,
        customMin: -500,
        customMax: 500,
        step: 0.5,
        defaultValue: 4,
      },
      {
        key: 'q2',
        label: 'Charge 2 (q_2)',
        unit: 'μC',
        type: 'number',
        min: -6,
        max: 6,
        customMin: -500,
        customMax: 500,
        step: 0.5,
        defaultValue: -3,
      },
      {
        key: 'dist',
        label: 'Separation (r)',
        unit: 'm',
        type: 'number',
        min: 0.5,
        max: 3.0,
        customMin: 0.05,
        customMax: 20,
        step: 0.05,
        defaultValue: 1.2,
      },
    ],
    realScenarios: [
      {
        id: 'coul-balloon',
        sceneId: 'p3-coulomb',
        title: 'Two Charged Party Balloons',
        summary: 'Equal -2.5 μC static charges repelling across 0.40 m.',
        params: { q1: -2.5, q2: -2.5, dist: 0.4 },
      },
      {
        id: 'coul-precip',
        sceneId: 'p3-coulomb',
        title: 'Dust Precipitator Plate & Particle',
        summary: 'Opposite +12 μC and -4 μC charges attracting at 0.25 m.',
        params: { q1: 12, q2: -4, dist: 0.25 },
      },
      {
        id: 'coul-vande',
        sceneId: 'p3-coulomb',
        title: 'Van de Graaff Lab Spheres',
        summary: '+25 μC and +15 μC domes spaced 1.5 m apart.',
        params: { q1: 25, q2: 15, dist: 1.5 },
      },
    ],
  },

  'p3-circuits': {
    sceneId: 'p3-circuits',
    course: 'Physics 3',
    keywords: [
      'circuit',
      'resistor',
      'resistance',
      'voltage',
      'battery',
      'ohm',
      'series',
      'parallel',
      'bulb',
      'led',
      'car battery',
      'outlet',
      'power',
    ],
    params: [
      {
        key: 'mode',
        label: 'Circuit Wiring',
        type: 'select',
        defaultValue: 'series',
        options: [
          { value: 'series', label: 'Series Circuit' },
          { value: 'parallel', label: 'Parallel Circuit' },
        ],
      },
      {
        key: 'voltage',
        label: 'Source Voltage (V)',
        unit: 'V',
        type: 'number',
        min: 3,
        max: 24,
        customMin: 1,
        customMax: 250,
        step: 1,
        defaultValue: 12,
      },
      {
        key: 'r1',
        label: 'Resistor 1 (R_1)',
        unit: 'Ω',
        type: 'number',
        min: 2,
        max: 24,
        customMin: 0.5,
        customMax: 1000,
        step: 0.5,
        defaultValue: 6,
      },
      {
        key: 'r2',
        label: 'Resistor 2 (R_2)',
        unit: 'Ω',
        type: 'number',
        min: 2,
        max: 24,
        customMin: 0.5,
        customMax: 1000,
        step: 0.5,
        defaultValue: 12,
      },
    ],
    realScenarios: [
      {
        id: 'circ-headlight',
        sceneId: 'p3-circuits',
        title: 'Car 12V Parallel Headlights',
        summary: '12 V battery powering two 3 Ω halogen bulbs in parallel.',
        params: { mode: 'parallel', voltage: 12, r1: 3, r2: 3 },
      },
      {
        id: 'circ-outlet',
        sceneId: 'p3-circuits',
        title: '220V Home Kettle & Toaster (Parallel)',
        summary: '220 V outlet driving 32 Ω kettle & 48 Ω toaster in parallel.',
        params: { mode: 'parallel', voltage: 220, r1: 32, r2: 48 },
      },
      {
        id: 'circ-usb',
        sceneId: 'p3-circuits',
        title: '5V LED Voltage Divider (Series)',
        summary: '5 V USB supply across a 10 Ω LED load and 15 Ω current limiter.',
        params: { mode: 'series', voltage: 5, r1: 10, r2: 15 },
      },
    ],
  },

  'p3-magfield': {
    sceneId: 'p3-magfield',
    course: 'Physics 3',
    keywords: [
      'magnetic field',
      'wire',
      'solenoid',
      'electromagnet',
      'ampere',
      'mri',
      'power line',
      'right hand rule',
      'coil turns',
    ],
    params: [
      {
        key: 'mode',
        label: 'Conductor Geometry',
        type: 'select',
        defaultValue: 'wire',
        options: [
          { value: 'wire', label: 'Straight Wire' },
          { value: 'solenoid', label: 'Solenoid Coil' },
        ],
      },
      {
        key: 'current',
        label: 'Current (I)',
        unit: 'A',
        type: 'number',
        min: -15,
        max: 15,
        customMin: -200,
        customMax: 200,
        step: 1,
        defaultValue: 8,
      },
      {
        key: 'probeR',
        label: 'Distance (×5 cm)',
        unit: '×5 cm',
        type: 'number',
        min: 0.5,
        max: 3.0,
        customMin: 0.1,
        customMax: 20,
        step: 0.1,
        defaultValue: 1.5,
      },
      {
        key: 'turns',
        label: 'Coil Turns (N)',
        unit: 'turns',
        type: 'number',
        min: 15,
        max: 80,
        customMin: 5,
        customMax: 2000,
        step: 5,
        defaultValue: 40,
      },
    ],
    realScenarios: [
      {
        id: 'mag-starter',
        sceneId: 'p3-magfield',
        title: 'Car Starter Cable (120 A)',
        summary: 'High-current 120 A cable creating strong rings 10 cm (2×5 cm) away.',
        params: { mode: 'wire', current: 120, probeR: 2.0, turns: 40 },
      },
      {
        id: 'mag-lab-sol',
        sceneId: 'p3-magfield',
        title: 'Lab Electromagnet Solenoid',
        summary: '400-turn solenoid carrying 6 A produces a ~10 mT uniform core.',
        params: { mode: 'solenoid', current: 6, probeR: 1.5, turns: 400 },
      },
      {
        id: 'mag-mri',
        sceneId: 'p3-magfield',
        title: 'Superconducting MRI Bore',
        summary: '1600-turn high-current (180 A) solenoid core field demonstration.',
        params: { mode: 'solenoid', current: 180, probeR: 1.5, turns: 1600 },
      },
    ],
  },

  'p3-induction': {
    sceneId: 'p3-induction',
    course: 'Physics 3',
    keywords: [
      'induction',
      'faraday',
      'lenz',
      'emf',
      'flux',
      'magnet',
      'galvanometer',
      'flashlight',
      'shake',
      'pickup',
    ],
    params: [
      {
        key: 'speed',
        label: 'Magnet Speed',
        unit: '×',
        type: 'number',
        min: 0.4,
        max: 2.5,
        customMin: 0.1,
        customMax: 10,
        step: 0.1,
        defaultValue: 1.2,
      },
      {
        key: 'turns',
        label: 'Coil Turns (N)',
        unit: 'turns',
        type: 'number',
        min: 10,
        max: 60,
        customMin: 1,
        customMax: 1000,
        step: 5,
        defaultValue: 30,
      },
      {
        key: 'fieldB',
        label: 'Magnet Field (B)',
        unit: 'T',
        type: 'number',
        min: 0.2,
        max: 1.5,
        customMin: 0.05,
        customMax: 15,
        step: 0.05,
        defaultValue: 0.8,
      },
    ],
    realScenarios: [
      {
        id: 'ind-shake',
        sceneId: 'p3-induction',
        title: 'Shake-to-Charge Flashlight',
        summary: 'Neodymium magnet (1.2 T) shaken rapidly through a 200-turn coil.',
        params: { speed: 2.2, turns: 200, fieldB: 1.2 },
      },
      {
        id: 'ind-guitar',
        sceneId: 'p3-induction',
        title: 'Electric Guitar Pickup Coil',
        summary: 'Dense 600-turn coil sensing subtle flux changes from a 0.35 T magnet.',
        params: { speed: 1.4, turns: 600, fieldB: 0.35 },
      },
      {
        id: 'ind-slow',
        sceneId: 'p3-induction',
        title: 'Slow Lab Bar Magnet Demo',
        summary: 'Gentle 0.6× pass of a 0.5 T bar magnet through 25 turns.',
        params: { speed: 0.6, turns: 25, fieldB: 0.5 },
      },
    ],
  },

  'p3-motorgen': {
    sceneId: 'p3-motorgen',
    course: 'Physics 3',
    keywords: [
      'motor',
      'generator',
      'turbine',
      'hydroelectric',
      'wind',
      'fan',
      'dynamo',
      'armature',
      'alternator',
    ],
    params: [
      {
        key: 'mode',
        label: 'Device Mode',
        type: 'select',
        defaultValue: 'motor',
        options: [
          { value: 'motor', label: 'DC Motor (Electrical → Rotation)' },
          { value: 'generator', label: 'AC Generator (Rotation → EMF)' },
        ],
      },
      {
        key: 'fieldB',
        label: 'Magnetic Field (B)',
        unit: 'T',
        type: 'number',
        min: 0.2,
        max: 1.5,
        customMin: 0.05,
        customMax: 10,
        step: 0.05,
        defaultValue: 0.8,
      },
      {
        key: 'param',
        label: 'Current (I) / Speed (ω)',
        unit: 'A or rad/s',
        type: 'number',
        min: 1,
        max: 10,
        customMin: 0.2,
        customMax: 120,
        step: 0.5,
        defaultValue: 4,
      },
      {
        key: 'turns',
        label: 'Armature Turns (N)',
        unit: 'turns',
        type: 'number',
        min: 5,
        max: 40,
        customMin: 1,
        customMax: 500,
        step: 5,
        defaultValue: 20,
      },
    ],
    realScenarios: [
      {
        id: 'mg-fan',
        sceneId: 'p3-motorgen',
        title: 'Electric Desk Fan Motor',
        summary: 'DC motor drawing 3.5 A across 60 turns inside a 0.65 T stator.',
        params: { mode: 'motor', fieldB: 0.65, param: 3.5, turns: 60 },
      },
      {
        id: 'mg-hydro',
        sceneId: 'p3-motorgen',
        title: 'Hydroelectric Dam Generator',
        summary: 'Turbine spinning at 37.7 rad/s (360 rpm) across 150 turns in 1.1 T field.',
        params: { mode: 'generator', fieldB: 1.1, param: 37.7, turns: 150 },
      },
      {
        id: 'mg-bike',
        sceneId: 'p3-motorgen',
        title: 'Bicycle Wheel Dynamo',
        summary: 'Pedal-driven 45 rad/s generator producing peak EMF on 40 turns.',
        params: { mode: 'generator', fieldB: 0.7, param: 45, turns: 40 },
      },
    ],
  },
};

export function clampParamToCustomBounds(
  spec: SceneParamSpec,
  rawVal: number | string
): number | string {
  if (spec.type === 'select') {
    const valid = spec.options?.some((o) => o.value === String(rawVal));
    return valid ? String(rawVal) : String(spec.defaultValue);
  }
  const parsed = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal));
  if (!Number.isFinite(parsed)) return Number(spec.defaultValue);
  const low = spec.customMin ?? spec.min ?? -1e6;
  const high = spec.customMax ?? spec.max ?? 1e6;
  return Math.min(high, Math.max(low, parsed));
}

export function getDefaultParamsForScene(sceneId: string): Record<string, number | string> {
  const schema = SCENE_SCENARIO_SCHEMAS[sceneId];
  if (!schema) return {};
  const out: Record<string, number | string> = {};
  for (const p of schema.params) {
    out[p.key] = p.defaultValue;
  }
  return out;
}

interface ExtractedNumber {
  value: number;
  unit: string;
  contextBefore: string;
  contextAfter: string;
  index: number;
}

function extractUnitNumbers(text: string): ExtractedNumber[] {
  const results: ExtractedNumber[] = [];
  const regex =
    /(-?\d+(?:\.\d+)?)\s*(km\/h|kph|m\/s\^?2|m\/s²|km\/s|m\/s|kg\/m\^?3|kg\/m³|rad\/s|°c|deg(?:rees)?|°|μc|uc|turns|loops|ohms|ohm|ω|kpa|rpm|mol|re|me|m\^?2|m²|m\^?3|m³|cm|mm|km|kg|g|tons?|s|v|a|n|t|k|c|m)?\b/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const val = parseFloat(match[1]);
    if (!Number.isFinite(val)) continue;
    const rawUnit = (match[2] || '').toLowerCase();
    const start = Math.max(0, match.index - 28);
    const end = Math.min(text.length, match.index + match[0].length + 28);
    results.push({
      value: val,
      unit: rawUnit,
      contextBefore: text.slice(start, match.index).toLowerCase(),
      contextAfter: text.slice(match.index + match[0].length, end).toLowerCase(),
      index: match.index,
    });
  }
  return results;
}

function toSpeedMs(num: ExtractedNumber): number | null {
  if (num.unit === 'km/h' || num.unit === 'kph') return num.value / 3.6;
  if (num.unit === 'm/s') return num.value;
  if (num.unit === 'km/s') return num.value * 1000;
  return null;
}

function toLengthMeters(num: ExtractedNumber): number | null {
  if (num.unit === 'm') return num.value;
  if (num.unit === 'cm') return num.value / 100;
  if (num.unit === 'mm') return num.value / 1000;
  if (num.unit === 'km') return num.value * 1000;
  return null;
}

function toMassKg(num: ExtractedNumber): number | null {
  if (num.unit === 'kg') return num.value;
  if (num.unit === 'g') return num.value / 1000;
  if (num.unit === 'ton' || num.unit === 'tons') return num.value * 1000;
  return null;
}

/**
 * Deterministically parses real-world numbers & materials from a student's word-problem
 * or real-life scenario description and maps them into the target simulation's parameters.
 */
export function parseScenarioTextForScene(
  sceneId: string,
  rawText: string,
  baseParams?: Record<string, number | string>
): { params: Record<string, number | string>; matchedCount: number } {
  const schema = SCENE_SCENARIO_SCHEMAS[sceneId];
  const out: Record<string, number | string> = {
    ...getDefaultParamsForScene(sceneId),
    ...(baseParams || {}),
  };
  if (!schema || !rawText.trim()) {
    return { params: out, matchedCount: 0 };
  }

  const lower = rawText.toLowerCase();
  const nums = extractUnitNumbers(rawText);
  let matchedCount = 0;

  const setVal = (key: string, val: number | string) => {
    const spec = schema.params.find((p) => p.key === key);
    if (!spec) return;
    out[key] = clampParamToCustomBounds(spec, val);
    matchedCount += 1;
  };

  // Planet gravity detection for mechanics scenes
  const detectGravity = () => {
    const gMatch = nums.find((n) => n.unit === 'm/s^2' || n.unit === 'm/s²');
    if (gMatch) {
      setVal('gravity', gMatch.value);
      return;
    }
    if (/\bmoon\b|\blunar\b/.test(lower)) setVal('gravity', 1.62);
    else if (/\bmars\b/.test(lower)) setVal('gravity', 3.72);
    else if (/\bjupiter\b/.test(lower)) setVal('gravity', 24.79);
  };

  switch (sceneId) {
    case 'p1-projectile': {
      const ang = nums.find((n) => n.unit === '°' || n.unit.startsWith('deg'));
      if (ang) setVal('angle', ang.value);
      const spd = nums.map(toSpeedMs).find((v) => v !== null);
      if (spd !== undefined && spd !== null) setVal('speed', Math.abs(spd));
      detectGravity();
      break;
    }

    case 'p1-incline': {
      const ang = nums.find((n) => n.unit === '°' || n.unit.startsWith('deg'));
      if (ang) setVal('angle', ang.value);
      const mVal = nums.map(toMassKg).find((v) => v !== null);
      if (mVal !== undefined && mVal !== null) setVal('mass', mVal);
      const muMatch = rawText.match(/(?:μ|mu|friction(?:\s+coeff(?:icient)?)?)\s*[=:]?\s*(0\.\d+|1\.\d+|\.\d+)/i);
      if (muMatch) {
        setVal('mu', parseFloat(muMatch[1]));
      } else if (/\bice\b|\bicy\b|\bsmooth\b|\bfrictionless\b/.test(lower)) {
        setVal('mu', /\bfrictionless\b/.test(lower) ? 0 : 0.05);
      } else if (/\brough\b|\bconcrete\b|\brubber\b/.test(lower)) {
        setVal('mu', 0.55);
      }
      break;
    }

    case 'p1-freefall': {
      const hVal = nums.map(toLengthMeters).find((v) => v !== null);
      if (hVal !== undefined && hVal !== null) setVal('height', hVal);
      const mVal = nums.map(toMassKg).find((v) => v !== null);
      if (mVal !== undefined && mVal !== null) setVal('mass', mVal);
      detectGravity();
      break;
    }

    case 'p1-pendulum': {
      const lenVal = nums.map(toLengthMeters).find((v) => v !== null);
      if (lenVal !== undefined && lenVal !== null) setVal('length', lenVal);
      const ang = nums.find((n) => n.unit === '°' || n.unit.startsWith('deg'));
      if (ang) setVal('angle', ang.value);
      detectGravity();
      break;
    }

    case 'p1-collisions': {
      if (/\binelastic\b|\bstick\b|\bstuck\b|\bcouple\b|\blocked\b|\bmerge\b/.test(lower)) {
        setVal('collisionType', 'inelastic');
      } else if (/\belastic\b|\bbounce\b|\bbilliard\b/.test(lower)) {
        setVal('collisionType', 'elastic');
      }
      const masses = nums.map(toMassKg).filter((v): v is number => v !== null);
      if (masses[0] !== undefined) setVal('m1', masses[0]);
      if (masses[1] !== undefined) setVal('m2', masses[1]);
      const speeds = nums.map(toSpeedMs).filter((v): v is number => v !== null);
      if (speeds[0] !== undefined) setVal('v1', speeds[0]);
      if (speeds[1] !== undefined) {
        setVal('v2', speeds[1]);
      } else if (/\brest\b|\bstopped\b|\bparked\b|\bstationary\b/.test(lower)) {
        setVal('v2', 0);
      }
      break;
    }

    case 'p1-circular': {
      const rVal = nums.map(toLengthMeters).find((v) => v !== null);
      if (rVal !== undefined && rVal !== null) setVal('radius', rVal);
      const sVal = nums.map(toSpeedMs).find((v) => v !== null);
      if (sVal !== undefined && sVal !== null) setVal('speed', Math.abs(sVal));
      const mVal = nums.map(toMassKg).find((v) => v !== null);
      if (mVal !== undefined && mVal !== null) setVal('mass', mVal);
      break;
    }

    case 'p1-torque': {
      const rVal = nums.map(toLengthMeters).find((v) => v !== null);
      if (rVal !== undefined && rVal !== null) setVal('leverR', rVal);
      const fVal = nums.find((n) => n.unit === 'n');
      if (fVal) setVal('force', fVal.value);
      const ang = nums.find((n) => n.unit === '°' || n.unit.startsWith('deg'));
      if (ang) setVal('angle', ang.value);
      else if (/\bperpendicular\b|\bright angle\b/.test(lower)) setVal('angle', 90);
      const mVal = nums.map(toMassKg).find((v) => v !== null);
      if (mVal !== undefined && mVal !== null) setVal('diskMass', mVal);
      break;
    }

    case 'p2-orbit': {
      const reNum = nums.find((n) => n.unit === 're');
      if (reNum) {
        setVal('radiusRe', reNum.value);
      } else {
        const kmAlt = nums.find((n) => n.unit === 'km');
        if (kmAlt) {
          setVal('radiusRe', (6371 + kmAlt.value) / 6371);
        } else if (/\biss\b|\bspace station\b/.test(lower)) {
          setVal('radiusRe', 1.07);
        } else if (/\bgeostationary\b|\bgeo\b/.test(lower)) {
          setVal('radiusRe', 6.61);
        } else if (/\bgps\b/.test(lower)) {
          setVal('radiusRe', 4.17);
        }
      }
      const meNum = nums.find((n) => n.unit === 'me');
      if (meNum) setVal('planetMassMult', meNum.value);
      const mVal = nums.map(toMassKg).find((v) => v !== null);
      if (mVal !== undefined && mVal !== null) setVal('satMass', mVal);
      break;
    }

    case 'p2-buoyancy': {
      const densities = nums.filter((n) => n.unit === 'kg/m^3' || n.unit === 'kg/m³');
      if (densities[0]) setVal('objDensity', densities[0].value);
      if (densities[1]) setVal('fluidDensity', densities[1].value);
      if (!densities[0]) {
        if (/\bice\b/.test(lower)) setVal('objDensity', 917);
        else if (/\bwood\b|\boak\b|\bplank\b|\bboat\b/.test(lower)) setVal('objDensity', 600);
        else if (/\bsteel\b|\biron\b|\banchor\b/.test(lower)) setVal('objDensity', 7850);
        else if (/\baluminum\b/.test(lower)) setVal('objDensity', 2700);
      }
      if (!densities[1]) {
        if (/\bseawater\b|\bocean\b|\bsalt\b/.test(lower)) setVal('fluidDensity', 1025);
        else if (/\bmercury\b/.test(lower)) setVal('fluidDensity', 13600);
        else if (/\boil\b/.test(lower)) setVal('fluidDensity', 800);
        else if (/\bwater\b/.test(lower)) setVal('fluidDensity', 1000);
      }
      const vol = nums.find((n) => n.unit === 'm^3' || n.unit === 'm³');
      if (vol) setVal('volume', vol.value);
      break;
    }

    case 'p2-hydraulics': {
      const fVal = nums.find((n) => n.unit === 'n');
      if (fVal) setVal('f1', fVal.value);
      const areas = nums.filter((n) => n.unit === 'm^2' || n.unit === 'm²');
      if (areas[0]) setVal('a1', areas[0].value);
      if (areas[1]) setVal('a2', areas[1].value);
      break;
    }

    case 'p2-bernoulli': {
      const spd = nums.map(toSpeedMs).find((v) => v !== null);
      if (spd !== undefined && spd !== null) setVal('v1', spd);
      const lengths = nums.map(toLengthMeters).filter((v): v is number => v !== null);
      if (lengths[0] !== undefined) setVal('r1', lengths[0]);
      if (lengths[1] !== undefined) setVal('r2', lengths[1]);
      const dens = nums.find((n) => n.unit === 'kg/m^3' || n.unit === 'kg/m³');
      if (dens) setVal('density', dens.value);
      else if (/\boil\b/.test(lower)) setVal('density', 850);
      break;
    }

    case 'p2-thermal': {
      const temps = nums.filter((n) => n.unit === '°c' || n.unit === 'c' || n.unit === 'k');
      if (temps.length >= 2) {
        setVal('deltaT', Math.abs(temps[1].value - temps[0].value));
      } else if (temps[0]) {
        setVal('deltaT', Math.abs(temps[0].value));
      }
      const len = nums.map(toLengthMeters).find((v) => v !== null);
      if (len !== undefined && len !== null) setVal('l0', len);
      if (/\bsteel\b|\brail\b|\bbridge\b/.test(lower)) setVal('alphaMicro', 12);
      else if (/\bcopper\b/.test(lower)) setVal('alphaMicro', 17);
      else if (/\baluminum\b|\baluminium\b/.test(lower)) setVal('alphaMicro', 23);
      else if (/\bbrass\b/.test(lower)) setVal('alphaMicro', 19);
      break;
    }

    case 'p2-thermo': {
      const kTemps = nums.filter((n) => n.unit === 'k');
      const cTemps = nums.filter((n) => n.unit === '°c' || n.unit === 'c');
      const kelvinValues =
        kTemps.length > 0
          ? kTemps.map((t) => t.value)
          : cTemps.map((t) => t.value + 273.15);
      if (kelvinValues.length >= 2) {
        const hi = Math.max(kelvinValues[0], kelvinValues[1]);
        const lo = Math.min(kelvinValues[0], kelvinValues[1]);
        setVal('tHot', hi);
        setVal('tCold', lo);
      } else if (kelvinValues.length === 1) {
        setVal('tHot', kelvinValues[0]);
      }
      const mol = nums.find((n) => n.unit === 'mol');
      if (mol) setVal('moles', mol.value);
      break;
    }

    case 'p3-coulomb': {
      const charges = nums.filter((n) => n.unit === 'μc' || n.unit === 'uc');
      if (charges[0]) setVal('q1', charges[0].value);
      if (charges[1]) setVal('q2', charges[1].value);
      const len = nums.map(toLengthMeters).find((v) => v !== null);
      if (len !== undefined && len !== null) setVal('dist', len);
      break;
    }

    case 'p3-circuits': {
      if (/\bparallel\b/.test(lower)) setVal('mode', 'parallel');
      else if (/\bseries\b/.test(lower)) setVal('mode', 'series');
      const volts = nums.find((n) => n.unit === 'v');
      if (volts) setVal('voltage', volts.value);
      const ohms = nums.filter((n) => n.unit === 'ω' || n.unit === 'ohm' || n.unit === 'ohms');
      if (ohms[0]) setVal('r1', ohms[0].value);
      if (ohms[1]) setVal('r2', ohms[1].value);
      break;
    }

    case 'p3-magfield': {
      if (/\bsolenoid\b|\bcoil\b|\belectromagnet\b|\bmri\b/.test(lower)) setVal('mode', 'solenoid');
      else if (/\bwire\b|\bcable\b/.test(lower)) setVal('mode', 'wire');
      const amps = nums.find((n) => n.unit === 'a');
      if (amps) setVal('current', amps.value);
      const turns = nums.find((n) => n.unit === 'turns' || n.unit === 'loops');
      if (turns) setVal('turns', turns.value);
      const distM = nums.map(toLengthMeters).find((v) => v !== null);
      if (distM !== undefined && distM !== null) {
        // probeR unit is ×5 cm = 0.05 m
        setVal('probeR', distM / 0.05);
      }
      break;
    }

    case 'p3-induction': {
      const turns = nums.find((n) => n.unit === 'turns' || n.unit === 'loops');
      if (turns) setVal('turns', turns.value);
      const bVal = nums.find((n) => n.unit === 't');
      if (bVal) setVal('fieldB', bVal.value);
      const spd = nums.map(toSpeedMs).find((v) => v !== null);
      if (spd !== undefined && spd !== null) setVal('speed', Math.min(10, Math.max(0.2, spd * 0.6)));
      break;
    }

    case 'p3-motorgen': {
      const isGen = /\bgenerator\b|\bturbine\b|\bdynamo\b|\bhydro\b|\bwind\b|\brpm\b|\brad\/s\b/.test(lower);
      if (isGen) setVal('mode', 'generator');
      else if (/\bmotor\b|\bfan\b/.test(lower)) setVal('mode', 'motor');
      const bVal = nums.find((n) => n.unit === 't');
      if (bVal) setVal('fieldB', bVal.value);
      const turns = nums.find((n) => n.unit === 'turns' || n.unit === 'loops');
      if (turns) setVal('turns', turns.value);
      const amps = nums.find((n) => n.unit === 'a');
      const radS = nums.find((n) => n.unit === 'rad/s');
      const rpm = nums.find((n) => n.unit === 'rpm');
      if (radS) setVal('param', radS.value);
      else if (rpm) setVal('param', (rpm.value * Math.PI) / 30);
      else if (amps) setVal('param', amps.value);
      break;
    }
  }

  return { params: out, matchedCount };
}

/**
 * Picks the best matching 3D simulation scene for any user-described real-world physics scenario
 * and extracts its custom parameters deterministically.
 */
export function detectAndParseRealScenario(rawText: string): {
  sceneId: string;
  params: Record<string, number | string>;
  matchedCount: number;
} | null {
  const clean = rawText.trim();
  if (!clean) return null;
  const lower = clean.toLowerCase();

  let bestSceneId = 'p1-projectile';
  let bestScore = -1;

  for (const schema of Object.values(SCENE_SCENARIO_SCHEMAS)) {
    let score = 0;
    for (const kw of schema.keywords) {
      if (lower.includes(kw)) {
        score += kw.includes(' ') ? 5 : 3;
      }
    }
    const parsed = parseScenarioTextForScene(schema.sceneId, clean);
    score += parsed.matchedCount * 2;
    if (score > bestScore) {
      bestScore = score;
      bestSceneId = schema.sceneId;
    }
  }

  const finalParsed = parseScenarioTextForScene(bestSceneId, clean);
  return {
    sceneId: bestSceneId,
    params: finalParsed.params,
    matchedCount: finalParsed.matchedCount,
  };
}
