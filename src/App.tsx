/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Minus,
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Info, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Award,
  Copy,
  LayoutGrid,
  BarChart3,
  Menu,
  X,
  Sun,
  Moon,
  RotateCcw,
  GripVertical
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { 
  HFDClass, 
  HFDRank, 
  BASE_PAY_STRUCTURE, 
  CBA_INCREASES, 
  REFERENCE_DATE,
  INCENTIVES, 
  CLASS_RANKS,
  getFY10Increase
} from './data/salaryData';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface SimulationState {
  rank: HFDRank;
  hfdClass: HFDClass;
  incentives: {
    hazmat: boolean;
    dto: boolean;
    fto: boolean;
    emtSuppression: boolean;
    paramedicType: 'none' | 'ems' | 'pop' | 'restricted';
    degree: 'none' | 'bachelor' | 'master' | 'doctorate';
    arsonActive: boolean;
    bilingual: boolean;
    inspectorAssignment: boolean;
    rescueArff: boolean;
  };
}

interface PathStep extends SimulationState {
  id: string;
  date: string;
}

interface Simulation extends SimulationState {
  id: string;
  name: string;
  color: string;
  swornDate: string;
  arsonStartDate?: string; // Optional start date for arson steps
  careerEvents: PathStep[]; // Renamed for compatibility with existing code but using PathStep type
}

const DEFAULT_INCENTIVES: Simulation['incentives'] = {
  hazmat: false,
  dto: false,
  fto: false,
  paramedicType: 'none',
  emtSuppression: false,
  degree: 'none',
  arsonActive: false,
  bilingual: false,
  inspectorAssignment: false,
  rescueArff: false,
};

const DEFAULT_SIM: Simulation = {
  id: '1',
  name: 'Example Insp.',
  color: '#ef4444',
  swornDate: '2014-03-31',
  rank: HFDRank.FIREFIGHTER,
  hfdClass: HFDClass.SUPPRESSION,
  careerEvents: [
    {
      id: 'eo-step',
      date: '2020-12-02',
      rank: HFDRank.ENGINEER,
      hfdClass: HFDClass.SUPPRESSION,
      incentives: { ...DEFAULT_INCENTIVES, emtSuppression: true }
    },
    {
      id: 'inspector-step',
      date: '2025-05-20',
      rank: HFDRank.INSPECTOR,
      hfdClass: HFDClass.PREVENTION,
      incentives: { ...DEFAULT_INCENTIVES, inspectorAssignment: true, degree: 'master' }
    }
  ],
  incentives: { ...DEFAULT_INCENTIVES },
};

const DEFAULT_SIM_2: Simulation = {
  id: '2',
  name: 'Example EOE',
  color: '#3b82f6',
  swornDate: '2014-03-31',
  rank: HFDRank.FIREFIGHTER,
  hfdClass: HFDClass.SUPPRESSION,
  careerEvents: [
    {
      id: 'eo-step-2',
      date: '2020-12-02',
      rank: HFDRank.ENGINEER,
      hfdClass: HFDClass.SUPPRESSION,
      incentives: { ...DEFAULT_INCENTIVES, emtSuppression: true }
    }
  ],
  incentives: { ...DEFAULT_INCENTIVES },
};

const DEFAULT_SIM_3: Simulation = {
  id: '3',
  name: 'Example FF',
  color: '#10b981',
  swornDate: '2014-03-31',
  rank: HFDRank.FIREFIGHTER,
  hfdClass: HFDClass.SUPPRESSION,
  careerEvents: [],
  incentives: { ...DEFAULT_INCENTIVES },
};

const THEME_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#64748b', // Slate
];

// --- Logic ---

const calculateSalary = (sim: Simulation, targetDate: Date, escalators?: Record<string, number>, hypothetical?: { enabled: boolean, rate: number }) => {
  const swornDate = new Date(sim.swornDate);
  
  // If target date is before sworn date, return zeroed results
  if (targetDate < swornDate) {
    return {
      base: 0,
      longevity: 0,
      incentives: 0,
      biweekly: 0,
      annual: 0,
      years: 0,
      rank: sim.rank,
      hfdClass: sim.hfdClass,
      incentiveBreakdown: [] as { label: string, value: number }[]
    };
  }

  // Determine active state at targetDate
  const sortedEvents = [...sim.careerEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let activeState: SimulationState = {
    rank: sim.rank,
    hfdClass: sim.hfdClass,
    incentives: sim.incentives
  };
  let activePromotionDate = swornDate; // Default to sworn date for FF steps

  for (const event of sortedEvents) {
    const eventDate = new Date(event.date);
    if (eventDate <= targetDate) {
      activeState = {
        rank: event.rank,
        hfdClass: event.hfdClass,
        incentives: event.incentives
      };
      activePromotionDate = eventDate;
    } else {
      break;
    }
  }
  
  const totalYears = Math.floor((targetDate.getTime() - swornDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  const gradeYears = Math.floor((targetDate.getTime() - activePromotionDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  
  // 1. Base Pay from Table (FY24 Base)
  const structure = BASE_PAY_STRUCTURE[activeState.rank];
  const yearsForStep = structure.type === 'total' ? totalYears : gradeYears;
  
  let baseBiweekly = structure.steps[0].biweekly;
  for (const step of structure.steps) {
    if (yearsForStep >= step.minYears && (step.maxYears === null || yearsForStep < step.maxYears)) {
      baseBiweekly = step.biweekly;
      break;
    }
  }

  // 2. CBA Increases (Compounding)
  let adjustedBase = baseBiweekly;
  const isGradeV = activeState.rank.endsWith(', V');
  
  if (targetDate >= REFERENCE_DATE) {
    // Forward compounding
    CBA_INCREASES.forEach(inc => {
      if (inc.date > REFERENCE_DATE && inc.date <= targetDate) {
        let rate = (isGradeV && inc.baseGradeV !== undefined) ? inc.baseGradeV : inc.base;
        // Apply escalator overrides
        if (escalators && escalators[inc.id] !== undefined) {
          rate = escalators[inc.id];
        }
        adjustedBase *= (1 + rate);
      }
    });

    // Hypothetical compounding beyond FY29
    if (hypothetical?.enabled) {
      const lastCBADate = CBA_INCREASES[CBA_INCREASES.length - 1].date;
      if (targetDate > lastCBADate) {
        // Calculate full fiscal years beyond FY29
        const yearsBeyond = targetDate.getFullYear() - lastCBADate.getFullYear();
        if (yearsBeyond > 0) {
          adjustedBase *= Math.pow(1 + hypothetical.rate, yearsBeyond);
        }
      }
    }
  } else {
    // Reverse compounding
    // Sort increases descending to reverse them in order
    const reverseIncreases = [...CBA_INCREASES].sort((a, b) => b.date.getTime() - a.date.getTime());
    reverseIncreases.forEach(inc => {
      if (inc.date > targetDate && inc.date <= REFERENCE_DATE) {
        let rate = (isGradeV && inc.baseGradeV !== undefined) ? inc.baseGradeV : inc.base;
        
        if (inc.id === 'FY10') {
          // Find step index for FY10 variable rates
          let stepIndex = 0;
          for (let i = 0; i < structure.steps.length; i++) {
            const step = structure.steps[i];
            if (yearsForStep >= step.minYears && (step.maxYears === null || yearsForStep < step.maxYears)) {
              stepIndex = i;
              break;
            }
          }
          rate = getFY10Increase(activeState.rank, stepIndex);
        }

        adjustedBase /= (1 + rate);
      }
    });
  }

  // 3. Longevity
  const longevityYears = Math.min(totalYears, INCENTIVES.MAX_LONGEVITY_YEARS);
  const longevityPay = longevityYears * INCENTIVES.LONGEVITY_PER_YEAR;

  // 4. Incentives
  let incentiveTotal = 0;
  const inc = activeState.incentives;
  const breakdown: { label: string, value: number }[] = [];

  if (inc.hazmat) { incentiveTotal += INCENTIVES.HAZMAT; breakdown.push({ label: 'Hazmat', value: INCENTIVES.HAZMAT }); }
  if (inc.dto) { incentiveTotal += INCENTIVES.DTO; breakdown.push({ label: 'DTO', value: INCENTIVES.DTO }); }
  if (inc.fto) { incentiveTotal += INCENTIVES.FTO; breakdown.push({ label: 'FTO', value: INCENTIVES.FTO }); }
  if (inc.bilingual) { incentiveTotal += INCENTIVES.BILINGUAL; breakdown.push({ label: 'Bilingual', value: INCENTIVES.BILINGUAL }); }
  if (inc.inspectorAssignment) { incentiveTotal += INCENTIVES.INSPECTOR_ASSIGNMENT; breakdown.push({ label: 'Inspector Assignment', value: INCENTIVES.INSPECTOR_ASSIGNMENT }); }
  if (inc.rescueArff) { incentiveTotal += INCENTIVES.RESCUE_ARFF; breakdown.push({ label: 'Rescue/ARFF', value: INCENTIVES.RESCUE_ARFF }); }
  if (inc.emtSuppression) { incentiveTotal += INCENTIVES.EMT_SUPPRESSION; breakdown.push({ label: 'EMT Suppression', value: INCENTIVES.EMT_SUPPRESSION }); }

  // Paramedic
  if (inc.paramedicType === 'ems') { incentiveTotal += INCENTIVES.PARAMEDIC_EMS; breakdown.push({ label: 'Paramedic (EMS)', value: INCENTIVES.PARAMEDIC_EMS }); }
  else if (inc.paramedicType === 'pop') { incentiveTotal += INCENTIVES.PARAMEDIC_POP; breakdown.push({ label: 'Paramedic (POP)', value: INCENTIVES.PARAMEDIC_POP }); }
  else if (inc.paramedicType === 'restricted') { incentiveTotal += INCENTIVES.PARAMEDIC_RESTRICTED; breakdown.push({ label: 'Paramedic (Restricted)', value: INCENTIVES.PARAMEDIC_RESTRICTED }); }

  // Degree
  if (inc.degree === 'bachelor') { incentiveTotal += INCENTIVES.DEGREE_BACHELOR; breakdown.push({ label: "Bachelor's Degree", value: INCENTIVES.DEGREE_BACHELOR }); }
  else if (inc.degree === 'master') { incentiveTotal += INCENTIVES.DEGREE_MASTER; breakdown.push({ label: "Master's Degree", value: INCENTIVES.DEGREE_MASTER }); }
  else if (inc.degree === 'doctorate') { incentiveTotal += INCENTIVES.DEGREE_DOCTORATE; breakdown.push({ label: "Doctorate Degree", value: INCENTIVES.DEGREE_DOCTORATE }); }

  // Arson logic
  if (inc.arsonActive) {
    // Find when arson was first activated
    let arsonStartDate = sim.arsonStartDate ? new Date(sim.arsonStartDate) : (sim.incentives.arsonActive ? swornDate : null);
    
    for (const event of sortedEvents) {
      const eventDate = new Date(event.date);
      if (eventDate > targetDate) break;
      
      if (event.incentives.arsonActive && !arsonStartDate) {
        arsonStartDate = eventDate;
      } else if (!event.incentives.arsonActive) {
        arsonStartDate = null; // Reset if they stopped being arson
      }
    }

    if (arsonStartDate) {
      const arsonYears = Math.floor((targetDate.getTime() - arsonStartDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      let arsonVal = 0;
      let arsonLabel = '';
      if (arsonYears >= 12) { arsonVal = INCENTIVES.ARSON_STEP_3; arsonLabel = 'Arson Step 3'; }
      else if (arsonYears >= 6) { arsonVal = INCENTIVES.ARSON_STEP_2; arsonLabel = 'Arson Step 2'; }
      else { arsonVal = INCENTIVES.ARSON_STEP_1; arsonLabel = 'Arson Step 1'; }
      incentiveTotal += arsonVal;
      breakdown.push({ label: arsonLabel, value: arsonVal });
    }
  }

  // Certification Pay (Based on total years)
  let certVal = 0;
  let certLabel = '';
  if (totalYears >= 12) { certVal = INCENTIVES.CERT_LEVEL_3; certLabel = 'Certification Level 3'; }
  else if (totalYears >= 6) { certVal = INCENTIVES.CERT_LEVEL_2; certLabel = 'Certification Level 2'; }
  else { certVal = INCENTIVES.CERT_LEVEL_1; certLabel = 'Certification Level 1'; }
  incentiveTotal += certVal;
  breakdown.push({ label: certLabel, value: certVal });

  const totalBiweekly = adjustedBase + longevityPay + incentiveTotal;
  const totalAnnual = totalBiweekly * 26;

  return {
    base: adjustedBase,
    longevity: longevityPay,
    incentives: incentiveTotal,
    biweekly: totalBiweekly,
    annual: totalAnnual,
    years: totalYears,
    rank: activeState.rank,
    hfdClass: activeState.hfdClass,
    incentiveBreakdown: breakdown
  };
};

// --- Components ---

export default function App() {
  const [sims, setSims] = useState<Simulation[]>(() => {
    const saved = localStorage.getItem('hfd_sims');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse sims', e);
      }
    }
    return [DEFAULT_SIM, DEFAULT_SIM_2, DEFAULT_SIM_3];
  });

  const [activeSimId, setActiveSimId] = useState<string>(() => {
    return localStorage.getItem('hfd_activeSimId') || '1';
  });

  const [payMode, setPayMode] = useState<'annual' | 'biweekly'>(() => {
    return (localStorage.getItem('hfd_payMode') as any) || 'annual';
  });

  const [viewMode, setViewMode] = useState<'dashboard' | 'compare' | 'payscale' | 'edit-sim' | 'reset'>(() => {
    const saved = localStorage.getItem('hfd_viewMode');
    if (saved === 'edit' || saved === 'edit-path') return 'dashboard';
    return (saved as any) || 'dashboard';
  });

  const [escalators, setEscalators] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('hfd_escalators');
    if (saved) return JSON.parse(saved);
    return {
      'FY26': 0.06,
      'FY27': 0.03,
      'FY28': 0.04,
      'FY29': 0.04
    };
  });

  const [hypothetical, setHypothetical] = useState(() => {
    const saved = localStorage.getItem('hfd_hypothetical');
    if (saved) return JSON.parse(saved);
    return {
      enabled: false,
      years: 5,
      rate: 0.025
    };
  });

  const [draftSim, setDraftSim] = useState<Simulation | null>(() => {
    const saved = localStorage.getItem('hfd_draftSim');
    if (saved && saved !== 'null') {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse draftSim', e);
      }
    }
    return null;
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [draggedSimId, setDraggedSimId] = useState<string | null>(null);
  const [dragOverSimId, setDragOverSimId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('hfd_darkMode');
    return saved ? JSON.parse(saved) : true;
  });
  const [zoomLevel, setZoomLevel] = useState(() => {
    const saved = localStorage.getItem('hfd_zoomLevel');
    return saved ? parseInt(saved, 10) : 2;
  });
  
  // Payscale Tab State
  const [payscaleClass, setPayscaleClass] = useState<HFDClass>(HFDClass.SUPPRESSION);
  const [payscaleRank, setPayscaleRank] = useState<HFDRank>(HFDRank.FIREFIGHTER);
  const [payscaleMode, setPayscaleMode] = useState<'current' | 'cares' | 'cba2011' | 'cba2009' | 'hypothetical'>('current');

  // Persistence
  useEffect(() => {
    localStorage.setItem('hfd_sims', JSON.stringify(sims));
  }, [sims]);

  useEffect(() => {
    localStorage.setItem('hfd_activeSimId', activeSimId);
  }, [activeSimId]);

  useEffect(() => {
    localStorage.setItem('hfd_payMode', payMode);
  }, [payMode]);

  useEffect(() => {
    localStorage.setItem('hfd_viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('hfd_escalators', JSON.stringify(escalators));
  }, [escalators]);

  useEffect(() => {
    localStorage.setItem('hfd_hypothetical', JSON.stringify(hypothetical));
  }, [hypothetical]);

  useEffect(() => {
    localStorage.setItem('hfd_draftSim', JSON.stringify(draftSim));
  }, [draftSim]);

  useEffect(() => {
    localStorage.setItem('hfd_darkMode', JSON.stringify(isDarkMode));
    if (!isDarkMode) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('hfd_zoomLevel', zoomLevel.toString());
    const sizes = ['12px', '14px', '16px', '18px', '20px'];
    document.documentElement.style.fontSize = sizes[zoomLevel];
  }, [zoomLevel]);

  // Safety: if in edit mode but no draft, go back to dashboard
  useEffect(() => {
    if (viewMode === 'edit-sim' && !draftSim) {
      setViewMode('dashboard');
    }
  }, [viewMode, draftSim]);

  // Update rank when class changes in payscale tab
  useEffect(() => {
    const ranks = CLASS_RANKS[payscaleClass];
    if (!ranks.includes(payscaleRank)) {
      setPayscaleRank(ranks[0]);
    }
  }, [payscaleClass, payscaleRank]);

  const activeSim = sims.find(s => s.id === activeSimId) || sims[0];

  const startEditingSim = (sim: Simulation) => {
    setDraftSim(JSON.parse(JSON.stringify(sim)));
    setViewMode('edit-sim');
  };

  const saveDraft = () => {
    if (!draftSim) return;
    setSims(sims.map(s => s.id === draftSim.id ? draftSim : s));
    setDraftSim(null);
    setViewMode('dashboard');
  };

  const resetToDefaults = () => {
    setViewMode('reset');
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedSimId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragOverSimId) {
      setDragOverSimId(id);
    }
  };

  const handleDragEnd = () => {
    setDraggedSimId(null);
    setDragOverSimId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedSimId || draggedSimId === targetId) {
      handleDragEnd();
      return;
    }

    const draggedIndex = sims.findIndex(s => s.id === draggedSimId);
    const targetIndex = sims.findIndex(s => s.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newSims = [...sims];
    const [draggedSim] = newSims.splice(draggedIndex, 1);
    newSims.splice(targetIndex, 0, draggedSim);

    setSims(newSims);
    handleDragEnd();
  };

  const cancelDraft = () => {
    setDraftSim(null);
    setViewMode('dashboard');
  };

  const addSim = () => {
    const newId = Math.random().toString(36).substring(7);
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const bottomMostSim = sims[sims.length - 1];
    const newSim: Simulation = {
      ...bottomMostSim,
      id: newId,
      name: `Simulation ${sims.length + 1}`,
      color: colors[sims.length % colors.length],
      careerEvents: bottomMostSim.careerEvents.map(e => ({ ...e, id: Math.random().toString(36).substring(7) }))
    };
    setSims([...sims, newSim]);
    setActiveSimId(newId);
  };

  const deleteSim = (id: string) => {
    if (sims.length === 1) return;
    const newSims = sims.filter(s => s.id !== id);
    setSims(newSims);
    if (activeSimId === id) {
      setActiveSimId(newSims[0].id);
    }
  };

  const updateSim = (id: string, updates: Partial<Simulation>) => {
    setSims(sims.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const updateIncentives = (id: string, updates: Partial<Simulation['incentives']>) => {
    setSims(sims.map(s => s.id === id ? { ...s, incentives: { ...s.incentives, ...updates } } : s));
  };

  const addCareerEvent = (simId: string, date?: string) => {
    const sim = sims.find(s => s.id === simId);
    if (!sim) return;
    
    const newEvent: PathStep = {
      id: Math.random().toString(36).substring(7),
      date: date || new Date().toISOString().split('T')[0],
      rank: sim.rank,
      hfdClass: sim.hfdClass,
      incentives: { ...sim.incentives }
    };
    
    setSims(sims.map(s => s.id === simId ? { ...s, careerEvents: [...s.careerEvents, newEvent] } : s));
  };

  const removeCareerEvent = (simId: string, eventId: string) => {
    setSims(sims.map(s => s.id === simId ? { ...s, careerEvents: s.careerEvents.filter(e => e.id !== eventId) } : s));
  };

  const updateCareerEvent = (simId: string, eventId: string, updates: Partial<PathStep>) => {
    setSims(sims.map(s => s.id === simId ? { 
      ...s, 
      careerEvents: s.careerEvents.map(e => e.id === eventId ? { ...e, ...updates } : e) 
    } : s));
  };

  const updateStepIncentives = (simId: string, eventId: string, updates: Partial<Simulation['incentives']>) => {
    setSims(sims.map(s => s.id === simId ? { 
      ...s, 
      careerEvents: s.careerEvents.map(e => e.id === eventId ? { ...e, incentives: { ...e.incentives, ...updates } } : e) 
    } : s));
  };

  const currentSalary = useMemo(() => calculateSalary(activeSim, new Date(), escalators), [activeSim, escalators]);

  const fmtPct = (n: number) => Number((n * 100).toFixed(2)) + '%';

  const payscaleColumns = useMemo(() => {
    const future = CBA_INCREASES.filter(inc => inc.date >= REFERENCE_DATE && inc.id !== 'FY24');
    if (payscaleMode === 'current') return future;
    
    if (payscaleMode === 'cares') {
      return [
        { id: 'FY22', date: new Date('2021-07-01'), label: 'FY22 (+6%)' },
        { id: 'FY23', date: new Date('2022-07-01'), label: 'FY23 (+6/6.33%)' },
        { id: 'FY24', date: new Date('2023-07-01'), label: 'FY24 (+6/6.33%)' },
      ];
    }

    if (payscaleMode === 'cba2011') {
      return [
        { id: 'FY14', date: new Date('2013-07-01'), label: 'FY14 (+1%)' },
        { id: 'FY15', date: new Date('2014-07-01'), label: 'FY15 (+2%)' },
      ];
    }

    if (payscaleMode === 'cba2009') {
      return [
        { id: 'FY09', date: new Date('2008-07-01'), label: 'FY09' },
        { id: 'FY10', date: new Date('2009-07-01'), label: 'FY10 (Var%)' },
        { id: 'FY11', date: new Date('2010-07-01'), label: 'FY11 (+3.75%)' },
        { id: 'FY12', date: new Date('2011-07-01'), label: 'FY12 (+2% Jan)' },
      ];
    }
    
    if (payscaleMode === 'hypothetical') {
      const years = [];
      const startYear = 2029; // FY30 starts July 2029
      for (let i = 0; i < hypothetical.years; i++) {
        const year = startYear + i;
        const fy = `FY${(year + 1).toString().slice(-2)}`;
        years.push({
          id: fy,
          date: new Date(`${year}-07-01`),
          label: `${fy} (+${(hypothetical.rate * 100).toFixed(1)}%)`
        });
      }
      return years;
    }
    
    return [];
  }, [payscaleMode, hypothetical.years, hypothetical.rate]);

  const projectionData = useMemo(() => {
    // Find earliest sworn date across all simulations
    // Calculate Fiscal Year of sworn date: if month >= 6 (July), FY = year + 1, else year
    const minSwornFY = Math.min(...sims.map(s => {
      const d = new Date(s.swornDate);
      // getMonth is 0-indexed (0=Jan, 6=July)
      return d.getMonth() >= 6 ? d.getFullYear() + 1 : d.getFullYear();
    }));

    // Stop at FY09 (July 2008 - June 2009). FY09 starts in 2008.
    const startYear = Math.max(2008, minSwornFY - 1);
    
    const lastCBAYear = 2028; // Start of FY29
    const endYear = hypothetical.enabled ? lastCBAYear + hypothetical.years : lastCBAYear;
    
    // Collect all relevant timestamps
    const timestamps = new Set<number>();
    const fyTicks: number[] = [];

    // Add July 1st for every year
    for (let year = startYear; year <= endYear; year++) {
      const t = new Date(year, 6, 1).getTime();
      timestamps.add(t);
      fyTicks.push(t);
    }

    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    const data = sortedTimestamps.map(t => {
      const date = new Date(t);
      const year = date.getFullYear();
      // Fiscal Year calculation for label
      const fy = date.getMonth() >= 6 ? year + 1 : year;
      const isFYStart = date.getMonth() === 6 && date.getDate() === 1;
      
      const entry: any = {
        timestamp: t,
        date: date.toLocaleDateString(),
        label: isFYStart ? `FY${fy.toString().slice(-2)}` : date.toLocaleDateString(),
        isFYStart: isFYStart,
        isHypothetical: year > lastCBAYear,
      };

      sims.forEach(sim => {
        const swornDate = new Date(sim.swornDate);
        const swornFY = swornDate.getMonth() >= 6 ? swornDate.getFullYear() + 1 : swornDate.getFullYear();

        // If this timestamp is the start of the sworn FY, use the sworn date for calculation
        // This ensures we show the starting salary for the partial first year
        const isStartFY = fy === swornFY;
        
        // Event Marking Logic:
        // Mark this FY point if an event occurred in THIS fiscal year.
        // FY starts at t (July 1st) and ends at next July 1st.
        const currentFYStart = t;
        const nextFYStart = new Date(year + 1, 6, 1).getTime();
        
        // Check if sworn date falls in this range
        const swornTime = swornDate.getTime();
        const isSwornEvent = swornTime >= currentFYStart && swornTime < nextFYStart;
        
        // Check if any career event falls in this range
        const isCareerEvent = sim.careerEvents.some(e => {
            const eTime = new Date(e.date).getTime();
            return eTime >= currentFYStart && eTime < nextFYStart;
        });
        
        entry[`${sim.id}_isEvent`] = isSwornEvent || isCareerEvent;

        if (t < swornDate.getTime() && !isStartFY) {
             entry[sim.id] = null;
             entry[`${sim.id}_breakdown`] = null;
             entry[`${sim.id}_rank`] = null;
        } else {
             // Use swornDate if we are backfilling the start of the FY, otherwise use the timestamp date
             const calcDate = (isStartFY && t < swornDate.getTime()) ? swornDate : date;
             const result = calculateSalary(sim, calcDate, escalators, hypothetical);
             
             if (result.base > 0) {
                 const val = Math.round(payMode === 'annual' ? result.annual : result.biweekly);
                 entry[sim.id] = val;
                 entry[`${sim.id}_breakdown`] = {
                   base: Math.round((payMode === 'annual' ? result.base * 26 : result.base)),
                   longevity: Math.round((payMode === 'annual' ? result.longevity * 26 : result.longevity)),
                   incentives: Math.round((payMode === 'annual' ? result.incentives * 26 : result.incentives))
                 };
                 entry[`${sim.id}_rank`] = result.rank;
             } else {
                 entry[sim.id] = null;
                 entry[`${sim.id}_breakdown`] = null;
                 entry[`${sim.id}_rank`] = null;
             }
        }
      });
      
      return entry;
    });

    return { data, ticks: fyTicks };
  }, [sims, payMode, escalators, hypothetical]);

  const sortedSimsForChart = useMemo(() => {
    if (!projectionData.data.length) return sims;
    const lastDataPoint = projectionData.data[projectionData.data.length - 1];
    return [...sims].sort((a, b) => {
      const valA = lastDataPoint[a.id] || 0;
      const valB = lastDataPoint[b.id] || 0;
      return valA - valB; // Ascending order: lowest first, highest last (on top)
    });
  }, [sims, projectionData.data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isHypothetical = payload[0].payload.isHypothetical;
      // Extract FY from label if possible, or just use label
      // The label in data is "FYxx" or date string.
      // We want to show just "FYxx" if it's an FY start, which it is now.
      const displayLabel = payload[0].payload.label; 

      return (
        <div className="bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-800 min-w-[200px] max-w-[280px] md:max-w-none backdrop-blur-md bg-slate-900/90 z-50">
          {isHypothetical && (
            <div className="flex items-center justify-end mb-3">
              <span className="text-[8px] font-black px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded uppercase tracking-tighter">Hypothetical</span>
            </div>
          )}
          <div className="space-y-4">
            {[...payload].sort((a, b) => {
              if (b.value !== a.value) return b.value - a.value;
              const indexA = sortedSimsForChart.findIndex(s => s.id === a.dataKey);
              const indexB = sortedSimsForChart.findIndex(s => s.id === b.dataKey);
              return indexB - indexA;
            }).map((entry: any, index: number) => {
              const simId = entry.dataKey;
              const sim = sims.find(s => s.id === simId);
              if (!sim) return null;
              
              const rank = entry.payload[`${simId}_rank`];
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-sm font-bold text-slate-200">{sim.name}</span>
                    </div>
                    {rank && <span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 uppercase tracking-tighter">{rank}</span>}
                  </div>
                  <div className="pl-4">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-300">Total</span>
                      <span className="font-bold" style={{ color: entry.color }}>${entry.value.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg text-white shadow-lg shadow-red-900/20">
              <TrendingUp size={20} />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-slate-100">HFDcalc</h1>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl mr-2">
              <button
                onClick={() => setZoomLevel(Math.max(0, zoomLevel - 1))}
                disabled={zoomLevel === 0}
                className="px-2 py-1.5 rounded-lg text-sm font-medium transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Decrease Text Size"
              >
                <Minus size={16} />
              </button>
              <button
                onClick={() => setZoomLevel(Math.min(4, zoomLevel + 1))}
                disabled={zoomLevel === 4}
                className="px-2 py-1.5 rounded-lg text-sm font-medium transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Increase Text Size"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                title="Toggle Theme"
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button 
                onClick={() => setViewMode('dashboard')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  viewMode === 'dashboard' ? "bg-slate-700 shadow-sm text-red-400" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <div className="flex items-center gap-2">
                  <DollarSign size={16} />
                  <span>Calculator</span>
                </div>
              </button>
              <button 
                onClick={() => setViewMode('compare')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  viewMode === 'compare' ? "bg-slate-700 shadow-sm text-red-400" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} />
                  <span>Compare</span>
                </div>
              </button>
              <button 
                onClick={() => setViewMode('payscale')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  viewMode === 'payscale' ? "bg-slate-700 shadow-sm text-red-400" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <div className="flex items-center gap-2">
                  <LayoutGrid size={16} />
                  <span>Payscale</span>
                </div>
              </button>
              <button
                onClick={resetToDefaults}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                title="Reset to Defaults"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-slate-400 hover:text-slate-100 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-slate-900 border-b border-slate-800 overflow-hidden"
            >
              <div className="px-4 py-4 space-y-2">
                <button 
                  onClick={() => { setViewMode('dashboard'); setIsMenuOpen(false); }}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3",
                    viewMode === 'dashboard' ? "bg-slate-800 text-red-400" : "text-slate-400"
                  )}
                >
                  <DollarSign size={18} />
                  <span>Calculator</span>
                </button>
                <button 
                  onClick={() => { setViewMode('compare'); setIsMenuOpen(false); }}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3",
                    viewMode === 'compare' ? "bg-slate-800 text-red-400" : "text-slate-400"
                  )}
                >
                  <BarChart3 size={18} />
                  <span>Compare</span>
                </button>
                <button 
                  onClick={() => { setViewMode('payscale'); setIsMenuOpen(false); }}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3",
                    viewMode === 'payscale' ? "bg-slate-800 text-red-400" : "text-slate-400"
                  )}
                >
                  <LayoutGrid size={18} />
                  <span>Payscale</span>
                </button>
                <div className="h-px bg-slate-800 my-2" />
                <button 
                  onClick={() => { setIsDarkMode(!isDarkMode); setIsMenuOpen(false); }}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 text-slate-400"
                >
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                  <span>Toggle Theme</span>
                </button>
                <button 
                  onClick={() => { resetToDefaults(); setIsMenuOpen(false); }}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 text-slate-400"
                >
                  <RotateCcw size={18} />
                  <span>Reset to Defaults</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {viewMode === 'edit-sim' && draftSim ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-5xl mx-auto space-y-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-100">Edit Simulation: {draftSim.name}</h2>
                <p className="text-slate-400 text-sm mt-1">Configure service details, incentives, and career path.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={cancelDraft}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveDraft}
                  className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-900/20 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>

            <section className="bg-slate-900 rounded-3xl shadow-xl border border-slate-800 overflow-hidden">
              <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                <div className="flex flex-col gap-4 w-full">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Simulation Name</label>
                    <input 
                      type="text" 
                      value={draftSim.name}
                      onChange={(e) => setDraftSim({ ...draftSim, name: e.target.value })}
                      className="text-2xl font-bold bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500/20 outline-none w-full text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Theme Color</label>
                    <div className="flex items-center gap-2">
                      {THEME_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => setDraftSim({ ...draftSim, color })}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-all",
                            draftSim.color === color ? "border-white scale-110 shadow-lg" : "border-transparent hover:scale-110"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 border-b border-slate-800">
                <div className="space-y-8">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Calendar size={18} className="text-red-500" />
                    Service Details
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Initial Date</label>
                      <input 
                        type="date" 
                        value={draftSim.swornDate}
                        onChange={(e) => setDraftSim({ ...draftSim, swornDate: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Initial Class</label>
                      <select 
                        value={draftSim.hfdClass}
                        onChange={(e) => {
                          const newClass = e.target.value as HFDClass;
                          setDraftSim({ 
                            ...draftSim, 
                            hfdClass: newClass,
                            rank: CLASS_RANKS[newClass][0]
                          });
                        }}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                      >
                        {Object.values(HFDClass).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Initial Rank</label>
                      <select 
                        value={draftSim.rank}
                        onChange={(e) => setDraftSim({ ...draftSim, rank: e.target.value as HFDRank })}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                      >
                        {CLASS_RANKS[draftSim.hfdClass].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Award size={18} className="text-red-500" />
                    Initial Incentives
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <IncentiveToggle 
                        label="EMT Supp." 
                        active={draftSim.incentives.emtSuppression} 
                        onChange={(v) => setDraftSim({ ...draftSim, incentives: { ...draftSim.incentives, emtSuppression: v } })} 
                      />
                      <IncentiveToggle 
                        label="FTO" 
                        active={draftSim.incentives.fto} 
                        onChange={(v) => setDraftSim({ ...draftSim, incentives: { ...draftSim.incentives, fto: v } })} 
                      />
                      <IncentiveToggle 
                        label="DTO" 
                        active={draftSim.incentives.dto} 
                        onChange={(v) => setDraftSim({ ...draftSim, incentives: { ...draftSim.incentives, dto: v } })} 
                      />
                      <IncentiveToggle 
                        label="Bilingual" 
                        active={draftSim.incentives.bilingual} 
                        onChange={(v) => setDraftSim({ ...draftSim, incentives: { ...draftSim.incentives, bilingual: v } })} 
                      />
                      <IncentiveToggle 
                        label="Rescue/ARFF" 
                        active={draftSim.incentives.rescueArff} 
                        onChange={(v) => setDraftSim({ ...draftSim, incentives: { ...draftSim.incentives, rescueArff: v } })} 
                      />
                      <IncentiveToggle 
                        label="Hazmat" 
                        active={draftSim.incentives.hazmat} 
                        onChange={(v) => setDraftSim({ ...draftSim, incentives: { ...draftSim.incentives, hazmat: v } })} 
                      />
                      <IncentiveToggle 
                        label="Inspector" 
                        active={draftSim.incentives.inspectorAssignment} 
                        onChange={(v) => setDraftSim({ ...draftSim, incentives: { ...draftSim.incentives, inspectorAssignment: v } })} 
                      />
                      <IncentiveToggle 
                        label="Arson" 
                        active={draftSim.incentives.arsonActive} 
                        onChange={(v) => setDraftSim({ ...draftSim, incentives: { ...draftSim.incentives, arsonActive: v } })} 
                      />
                    </div>

                    {draftSim.incentives.arsonActive && (
                      <div className="p-4 bg-red-950/10 border border-red-900/20 rounded-xl space-y-3">
                        <label className="block text-[10px] font-bold text-red-400 uppercase tracking-wider">Arson Assignment Start Date</label>
                        <input 
                          type="date" 
                          value={draftSim.arsonStartDate || draftSim.swornDate}
                          onChange={(e) => setDraftSim({ ...draftSim, arsonStartDate: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                        />
                        <p className="text-[10px] text-slate-500 italic">
                          * Arson pay steps are calculated based on years in the Arson rank.
                        </p>
                      </div>
                    )}
                    
                    <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Paramedic</label>
                        <select 
                          value={draftSim.incentives.paramedicType}
                          onChange={(e) => setDraftSim({ ...draftSim, incentives: { ...draftSim.incentives, paramedicType: e.target.value as any } })}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                        >
                          <option value="none">None</option>
                          <option value="ems">EMS Unit</option>
                          <option value="pop">POP (Capt/Sr)</option>
                          <option value="restricted">Restricted</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Degree</label>
                        <select 
                          value={draftSim.incentives.degree}
                          onChange={(e) => setDraftSim({ ...draftSim, incentives: { ...draftSim.incentives, degree: e.target.value as any } })}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                        >
                          <option value="none">None</option>
                          <option value="bachelor">Bachelor's</option>
                          <option value="master">Master's</option>
                          <option value="doctorate">Doctorate</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Integrated Career Path Editor */}
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <TrendingUp size={18} className="text-red-500" />
                    Career Path Steps
                  </h3>
                  <button 
                    onClick={() => {
                      const newEvent: PathStep = {
                        id: Math.random().toString(36).substring(7),
                        date: new Date().toISOString().split('T')[0],
                        rank: draftSim.rank,
                        hfdClass: draftSim.hfdClass,
                        incentives: { ...draftSim.incentives }
                      };
                      setDraftSim({ ...draftSim, careerEvents: [...draftSim.careerEvents, newEvent] });
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all flex items-center gap-2"
                  >
                    <Plus size={14} />
                    Add Step
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {draftSim.careerEvents.length === 0 ? (
                    <div className="py-12 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600">
                      <TrendingUp size={32} className="mb-2 opacity-20" />
                      <p className="text-sm font-medium">No career steps added yet.</p>
                      <p className="text-xs">Add promotions or incentive changes over time.</p>
                    </div>
                  ) : (
                    draftSim.careerEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((event, idx) => {
                      const isExpanded = expandedStepId === event.id;
                      const [y, m, d] = event.date.split('-');
                      const displayDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).toLocaleDateString(undefined, { dateStyle: 'long' });
                      
                      return (
                        <div key={event.id} className="bg-slate-800/50 rounded-3xl border border-slate-700/50 overflow-hidden shadow-lg transition-all">
                          <div 
                            className="p-5 bg-slate-800 border-b border-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-750"
                            onClick={() => setExpandedStepId(isExpanded ? null : event.id)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-2xl bg-red-600/20 flex items-center justify-center text-red-500 text-sm font-black">
                                {idx + 1}
                              </div>
                              <div>
                                <h4 className="text-base font-bold text-slate-100">{event.rank.split(',')[0]}</h4>
                                <p className="text-xs text-slate-500 font-medium">Effective {displayDate}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDraftSim({ ...draftSim, careerEvents: draftSim.careerEvents.filter(ev => ev.id !== event.id) });
                                }}
                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                              <div className={cn("p-2 text-slate-400 transition-transform", isExpanded && "rotate-180")}>
                                <ChevronDown size={20} />
                              </div>
                            </div>
                          </div>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-10">
                                  <div className="space-y-6">
                                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Promotion Details</h5>
                                    <div className="space-y-4">
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">Effective Date</label>
                                        <input 
                                          type="date" 
                                          value={event.date}
                                          onChange={(e) => {
                                            const newEvents = draftSim.careerEvents.map(ev => ev.id === event.id ? { ...ev, date: e.target.value } : ev);
                                            setDraftSim({ ...draftSim, careerEvents: newEvents });
                                          }}
                                          className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                                        />
                                      </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">New Class</label>
                                <select 
                                  value={event.hfdClass}
                                  onChange={(e) => {
                                    const newClass = e.target.value as HFDClass;
                                    const newEvents = draftSim.careerEvents.map(ev => ev.id === event.id ? { 
                                      ...ev, 
                                      hfdClass: newClass,
                                      rank: CLASS_RANKS[newClass][0]
                                    } : ev);
                                    setDraftSim({ ...draftSim, careerEvents: newEvents });
                                  }}
                                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                                >
                                  {Object.values(HFDClass).map(c => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">New Rank</label>
                                <select 
                                  value={event.rank}
                                  onChange={(e) => {
                                    const newEvents = draftSim.careerEvents.map(ev => ev.id === event.id ? { ...ev, rank: e.target.value as HFDRank } : ev);
                                    setDraftSim({ ...draftSim, careerEvents: newEvents });
                                  }}
                                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                                >
                                  {CLASS_RANKS[event.hfdClass].map(r => (
                                    <option key={r} value={r}>{r}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="md:col-span-2 space-y-6">
                            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Incentive Changes at this Step</h5>
                            <div className="grid grid-cols-2 gap-3">
                              <IncentiveToggle 
                                label="EMT Supp." 
                                active={event.incentives.emtSuppression} 
                                onChange={(v) => {
                                  const newEvents = draftSim.careerEvents.map(ev => ev.id === event.id ? { ...ev, incentives: { ...ev.incentives, emtSuppression: v } } : ev);
                                  setDraftSim({ ...draftSim, careerEvents: newEvents });
                                }} 
                              />
                              <IncentiveToggle 
                                label="FTO" 
                                active={event.incentives.fto} 
                                onChange={(v) => {
                                  const newEvents = draftSim.careerEvents.map(ev => ev.id === event.id ? { ...ev, incentives: { ...ev.incentives, fto: v } } : ev);
                                  setDraftSim({ ...draftSim, careerEvents: newEvents });
                                }} 
                              />
                              <IncentiveToggle 
                                label="DTO" 
                                active={event.incentives.dto} 
                                onChange={(v) => {
                                  const newEvents = draftSim.careerEvents.map(ev => ev.id === event.id ? { ...ev, incentives: { ...ev.incentives, dto: v } } : ev);
                                  setDraftSim({ ...draftSim, careerEvents: newEvents });
                                }} 
                              />
                              <IncentiveToggle 
                                label="Bilingual" 
                                active={event.incentives.bilingual} 
                                onChange={(v) => {
                                  const newEvents = draftSim.careerEvents.map(ev => ev.id === event.id ? { ...ev, incentives: { ...ev.incentives, bilingual: v } } : ev);
                                  setDraftSim({ ...draftSim, careerEvents: newEvents });
                                }} 
                              />
                              <IncentiveToggle 
                                label="Rescue/ARFF" 
                                active={event.incentives.rescueArff} 
                                onChange={(v) => {
                                  const newEvents = draftSim.careerEvents.map(ev => ev.id === event.id ? { ...ev, incentives: { ...ev.incentives, rescueArff: v } } : ev);
                                  setDraftSim({ ...draftSim, careerEvents: newEvents });
                                }} 
                              />
                              <IncentiveToggle 
                                label="Hazmat" 
                                active={event.incentives.hazmat} 
                                onChange={(v) => {
                                  const newEvents = draftSim.careerEvents.map(ev => ev.id === event.id ? { ...ev, incentives: { ...ev.incentives, hazmat: v } } : ev);
                                  setDraftSim({ ...draftSim, careerEvents: newEvents });
                                }} 
                              />
                              <IncentiveToggle 
                                label="Inspector" 
                                active={event.incentives.inspectorAssignment} 
                                onChange={(v) => {
                                  const newEvents = draftSim.careerEvents.map(ev => ev.id === event.id ? { ...ev, incentives: { ...ev.incentives, inspectorAssignment: v } } : ev);
                                  setDraftSim({ ...draftSim, careerEvents: newEvents });
                                }} 
                              />
                              <IncentiveToggle 
                                label="Arson" 
                                active={event.incentives.arsonActive} 
                                onChange={(v) => {
                                  const newEvents = draftSim.careerEvents.map(ev => ev.id === event.id ? { ...ev, incentives: { ...ev.incentives, arsonActive: v } } : ev);
                                  setDraftSim({ ...draftSim, careerEvents: newEvents });
                                }} 
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Paramedic</label>
                                <select 
                                  value={event.incentives.paramedicType}
                                  onChange={(e) => {
                                    const newEvents = draftSim.careerEvents.map(ev => ev.id === event.id ? { ...ev, incentives: { ...ev.incentives, paramedicType: e.target.value as any } } : ev);
                                    setDraftSim({ ...draftSim, careerEvents: newEvents });
                                  }}
                                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                                >
                                  <option value="none">None</option>
                                  <option value="ems">EMS Unit</option>
                                  <option value="pop">POP (Capt/Sr)</option>
                                  <option value="restricted">Restricted</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Degree</label>
                                <select 
                                  value={event.incentives.degree}
                                  onChange={(e) => {
                                    const newEvents = draftSim.careerEvents.map(ev => ev.id === event.id ? { ...ev, incentives: { ...ev.incentives, degree: e.target.value as any } } : ev);
                                    setDraftSim({ ...draftSim, careerEvents: newEvents });
                                  }}
                                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                                >
                                  <option value="none">None</option>
                                  <option value="bachelor">Bachelor's</option>
                                  <option value="master">Master's</option>
                                  <option value="doctorate">Doctorate</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          </motion.div>
        ) : viewMode === 'reset' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto mt-10"
          >
            <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-8 text-center">
              <h2 className="text-2xl font-bold text-slate-100 mb-4">Reset to Defaults</h2>
              <p className="text-slate-400 mb-8">Are you sure you want to clear all data and reset to defaults? This action cannot be undone.</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setViewMode('dashboard')}
                  className="px-6 py-3 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    Object.keys(localStorage).forEach(key => {
                      if (key.startsWith('hfd_')) {
                        localStorage.removeItem(key);
                      }
                    });
                    window.location.reload();
                  }}
                  className="px-6 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 transition-all"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          </motion.div>
        ) : viewMode === 'payscale' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 rounded-3xl shadow-xl border border-slate-800 overflow-hidden"
          >
            <div className="p-8 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100">Master Payscale</h2>
                  <p className="text-slate-400 text-sm mt-1">Full compounding breakdown by Fiscal year.</p>
                </div>
                {payscaleMode === 'hypothetical' && (
                  <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg">
                    <Info size={14} className="text-blue-400" />
                    <span className="text-xs font-bold text-blue-400">Strictly hypothetical, be reasonable.</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Class</label>
                  <select 
                    value={payscaleClass}
                    onChange={(e) => {
                      const newClass = e.target.value as HFDClass;
                      setPayscaleClass(newClass);
                      setPayscaleRank(CLASS_RANKS[newClass][0]);
                    }}
                    className="w-full bg-slate-800 border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                  >
                    {Object.values(HFDClass).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rank</label>
                  <select 
                    value={payscaleRank}
                    onChange={(e) => setPayscaleRank(e.target.value as HFDRank)}
                    className="w-full bg-slate-800 border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                  >
                    {CLASS_RANKS[payscaleClass].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data View</label>
                  <select 
                    value={payscaleMode}
                    onChange={(e) => setPayscaleMode(e.target.value as any)}
                    className="w-full bg-slate-800 border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                  >
                    <option value="hypothetical">Hypothetical (FY30+)</option>
                    <option value="current">Current CBA (FY25-29)</option>
                    <option value="cares">CARES Act (FY22-24)</option>
                    <option value="cba2011">2011 CBA (FY14-15)</option>
                    <option value="cba2009">2009 CBA (FY09-12)</option>
                  </select>
                </div>

                {payscaleMode === 'hypothetical' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Years</label>
                      <input 
                        type="number" 
                        min="1"
                        max="20"
                        value={hypothetical.years}
                        onChange={(e) => setHypothetical({ ...hypothetical, years: Math.max(1, parseInt(e.target.value) || 0) })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Average</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          step="0.1"
                          value={(hypothetical.rate * 100).toFixed(1)}
                          onChange={(e) => setHypothetical({ ...hypothetical, rate: (parseFloat(e.target.value) || 0) / 100 })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                        <span className="absolute right-3 top-1.5 text-xs font-bold text-slate-500">%</span>
                      </div>
                    </div>

                    <div className="flex items-end pb-1 w-full sm:w-auto min-w-[140px]">
                      <IncentiveToggle
                        label="Add to Charts"
                        active={hypothetical.enabled}
                        onChange={(v) => setHypothetical({ ...hypothetical, enabled: v })}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">Year Range (Step)</th>
                    {payscaleColumns.map(col => {
                      const inc = CBA_INCREASES.find(i => i.id === col.id);
                      let label = col.id;
                      if (payscaleMode !== 'current' && payscaleMode !== 'hypothetical') {
                        label = col.label;
                        // Dynamic header for FY10, FY23, FY24
                        if (col.id === 'FY10') {
                          // Check if rate varies for this rank
                          let isVariable = false;
                          const structure = BASE_PAY_STRUCTURE[payscaleRank];
                          const rate0 = getFY10Increase(payscaleRank, 0);
                          
                          if (structure.steps.length > 1) {
                              for(let k=1; k<structure.steps.length; k++) {
                                  if (getFY10Increase(payscaleRank, k) !== rate0) {
                                      isVariable = true;
                                      break;
                                  }
                              }
                          }
                          
                          label = `FY10 (${isVariable ? 'VAR%' : `+${fmtPct(rate0)}`})`;
                        } else if (col.id === 'FY23' || col.id === 'FY24') {
                          const isGradeV = payscaleRank.endsWith(', V');
                          const rate = (isGradeV && inc?.baseGradeV !== undefined) ? inc.baseGradeV : (inc?.base || 0);
                          label = `${col.id} (+${fmtPct(rate)})`;
                        }
                      } else if (payscaleMode === 'hypothetical') {
                         label = col.label;
                      } else {
                        // Current mode
                        if (col.id === 'FY24') {
                          label = 'FY24';
                        } else {
                          const rate = escalators[col.id] !== undefined ? escalators[col.id] : ((payscaleRank.endsWith(', V') && inc?.baseGradeV !== undefined) ? inc.baseGradeV : (inc?.base || 0));
                          label = `${col.id} (+${fmtPct(rate)})`;
                        }
                      }
                      return (
                        <th key={col.id} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 text-right">
                          <div className="flex flex-col items-end">
                            <span>{label}</span>
                            {payscaleMode === 'current' && ['FY26', 'FY27', 'FY28', 'FY29'].includes(col.id) && (
                              <button 
                                onClick={() => {
                                  const current = escalators[col.id];
                                  const target = (col.id === 'FY27' || col.id === 'FY26') ? 0.03 : 0.04;
                                  setEscalators({ ...escalators, [col.id]: current === target ? 0.06 : target });
                                }}
                                className={cn(
                                  "mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter transition-all",
                                  escalators[col.id] === 0.06 ? "bg-red-600 text-white" : "bg-slate-800 text-slate-500 hover:text-slate-300"
                                )}
                              >
                                Escalator
                              </button>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {BASE_PAY_STRUCTURE[payscaleRank].steps.map((step, sIdx) => (
                    <tr key={sIdx} className="group hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-100">
                          {step.maxYears === null ? `${step.minYears}+ Years` : `${step.minYears}-${step.maxYears} Years`}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {BASE_PAY_STRUCTURE[payscaleRank].type === 'total' ? 'Total Service' : 'Time in Grade'}
                        </div>
                      </td>
                      {payscaleColumns.map((col) => {
                        // Calculate multiplier for this specific date
                        let multiplier = 1;
                        const targetDate = col.date;
                        const isGradeV = payscaleRank.endsWith(', V');
                        
                        if (targetDate >= REFERENCE_DATE) {
                          // Standard CBA increases
                          CBA_INCREASES.forEach(inc => {
                            if (inc.date > REFERENCE_DATE && inc.date <= targetDate) {
                              let rate = (isGradeV && inc.baseGradeV !== undefined) ? inc.baseGradeV : inc.base;
                              if (escalators[inc.id] !== undefined) {
                                rate = escalators[inc.id];
                              }
                              multiplier *= (1 + rate);
                            }
                          });

                          // Hypothetical increases
                          if (payscaleMode === 'hypothetical') {
                             const lastCBADate = CBA_INCREASES[CBA_INCREASES.length - 1].date;
                             if (targetDate > lastCBADate) {
                               const yearsBeyond = targetDate.getFullYear() - lastCBADate.getFullYear();
                               if (yearsBeyond > 0) {
                                 multiplier *= Math.pow(1 + hypothetical.rate, yearsBeyond);
                               }
                             }
                          }
                        } else {
                          const reverseIncreases = [...CBA_INCREASES].sort((a, b) => b.date.getTime() - a.date.getTime());
                          reverseIncreases.forEach(inc => {
                            if (inc.date > targetDate && inc.date <= REFERENCE_DATE) {
                              let rate = (isGradeV && inc.baseGradeV !== undefined) ? inc.baseGradeV : inc.base;
                              
                              if (inc.id === 'FY10') {
                                // Use the current step index for FY10 variable rates
                                rate = getFY10Increase(payscaleRank, sIdx);
                              }

                              multiplier /= (1 + rate);
                            }
                          });
                        }

                        const annual = step.biweekly * multiplier * 26;
                        
                        // For FY10, show the percentage used
                        let cellSubtext = `$${(step.biweekly * multiplier).toFixed(2)}/bw`;
                        let percentLabel = null;
                        if (col.id === 'FY10') {
                           const rate = getFY10Increase(payscaleRank, sIdx);
                           
                           // Check if variable
                           let isVariable = false;
                           const structure = BASE_PAY_STRUCTURE[payscaleRank];
                           const rate0 = getFY10Increase(payscaleRank, 0);
                           if (structure.steps.length > 1) {
                               for(let k=1; k<structure.steps.length; k++) {
                                   if (getFY10Increase(payscaleRank, k) !== rate0) {
                                       isVariable = true;
                                       break;
                                   }
                               }
                           }

                           if (isVariable) {
                               percentLabel = `(+${fmtPct(rate)})`;
                           }
                        }

                        return (
                          <td key={col.id} className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end">
                              {percentLabel && <span className="text-[10px] text-slate-500 font-bold mb-0.5">{percentLabel}</span>}
                              <div className="text-xs font-mono font-bold text-slate-200">${Math.round(annual).toLocaleString()}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{cellSubtext}</div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Sidebar: Simulations List */}
            {viewMode === 'dashboard' && (
              <div className="lg:col-span-3 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Simulations</h2>
                    <button 
                      onClick={addSim}
                      className="p-1 hover:bg-slate-800 rounded-md text-slate-400 transition-colors"
                      title="Add Simulation"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {sims.map(sim => (
                      <div 
                        key={sim.id} 
                        className="space-y-1"
                        draggable
                        onDragStart={(e) => handleDragStart(e, sim.id)}
                        onDragOver={(e) => handleDragOver(e, sim.id)}
                        onDrop={(e) => handleDrop(e, sim.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <div 
                          onClick={() => {
                            setActiveSimId(sim.id);
                          }}
                          className={cn(
                            "group relative p-3 rounded-xl border cursor-pointer transition-all",
                            activeSimId === sim.id 
                              ? "bg-slate-800 border-slate-700 shadow-lg ring-1 ring-slate-700" 
                              : "bg-slate-900 border-slate-800 hover:border-slate-700",
                            dragOverSimId === sim.id && "border-blue-500 bg-slate-800/80",
                            draggedSimId === sim.id && "opacity-50"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400">
                                <GripVertical size={14} />
                              </div>
                              <div 
                                className="w-4 h-4 rounded-full border border-slate-700 shrink-0"
                                style={{ backgroundColor: sim.color }}
                              />
                              <span className={cn(
                                "text-sm font-semibold truncate",
                                activeSimId === sim.id ? "text-slate-100" : "text-slate-400"
                              )} style={{ color: activeSimId === sim.id ? undefined : sim.color }}>
                                {sim.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingSim(sim);
                                }}
                                className="p-1 text-slate-500 hover:text-slate-100 transition-all"
                                title="Edit Simulation"
                              >
                                <LayoutGrid size={14} />
                              </button>
                              {sims.length > 1 && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteSim(sim.id);
                                  }}
                                  className="p-1 text-slate-500 hover:text-red-400 transition-all"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {activeSimId === sim.id && (
                          <div className="pl-4 pt-1 pb-2 space-y-2 border-l-2 border-slate-800 ml-2">
                            <div className="flex items-center justify-between px-2">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Career Path</span>
                            </div>
                            {sim.careerEvents.length === 0 ? (
                              <p className="px-2 text-[10px] text-slate-600 italic">No sub-paths added.</p>
                            ) : (
                              <div className="space-y-1">
                                {sim.careerEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((event, idx) => {
                                  const [y, m, d] = event.date.split('-');
                                  const displayDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
                                  return (
                                    <div key={event.id} className="flex items-center justify-between gap-2 px-2 py-1.5 bg-slate-900/50 rounded-lg border border-slate-800">
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-bold text-slate-300 truncate">{event.rank.split(',')[0]}</span>
                                        <span className="text-[8px] text-slate-500 font-mono">{displayDate}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className={cn(viewMode === 'compare' ? "lg:col-span-12" : "lg:col-span-9")}>
              {viewMode === 'dashboard' ? (
                <div className="space-y-8">
                  {/* Results Summary - Static */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ResultCard 
                      title="Bi-Weekly Pay" 
                      value={`$${currentSalary.biweekly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      icon={<DollarSign size={20} />}
                      color="bg-blue-500"
                    />
                    <ResultCard 
                      title="Annual Salary" 
                      value={`$${currentSalary.annual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      icon={<DollarSign size={20} />}
                      color="bg-emerald-500"
                    />
                    <ResultCard 
                      title="Years of Service" 
                      value={`${currentSalary.years} Years`}
                      icon={<Calendar size={20} />}
                      color="bg-amber-500"
                    />
                  </div>

                  {/* Breakdown and Projection - Affected by toggle */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <section className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6">
                      <h3 className="text-sm font-bold text-slate-200 mb-6 flex items-center gap-2">
                        <Info size={16} className="text-red-500" />
                        Pay Breakdown ({payMode === 'annual' ? 'Annual' : 'Bi-Weekly'})
                      </h3>
                      <div className="space-y-4">
                        <BreakdownRow label="Adjusted Base Pay" value={payMode === 'annual' ? currentSalary.base * 26 : currentSalary.base} />
                        <BreakdownRow label="Longevity Pay" value={payMode === 'annual' ? currentSalary.longevity * 26 : currentSalary.longevity} />
                        <div className="space-y-2">
                          <BreakdownRow label="Incentives & Certs" value={payMode === 'annual' ? currentSalary.incentives * 26 : currentSalary.incentives} />
                          {currentSalary.incentiveBreakdown.length > 0 && (
                            <div className="pl-4 space-y-1">
                              {currentSalary.incentiveBreakdown.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-500">{item.label}</span>
                                  <span className="text-slate-400 font-mono">${(payMode === 'annual' ? item.value * 26 : item.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-100">Total {payMode === 'annual' ? 'Annual' : 'Bi-Weekly'}</span>
                          <span className="text-lg font-black" style={{ color: activeSim.color }}>
                            ${(payMode === 'annual' ? currentSalary.annual : currentSalary.biweekly).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </section>

                    <section className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                          <TrendingUp size={16} className="text-red-500" />
                          Projection ({payMode === 'annual' ? 'Annual' : 'Bi-Weekly'})
                        </h3>
                        <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
                          <button 
                            onClick={() => setPayMode('biweekly')}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                              payMode === 'biweekly' ? "bg-red-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                            )}
                          >
                            Bi-Weekly
                          </button>
                          <button 
                            onClick={() => setPayMode('annual')}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                              payMode === 'annual' ? "bg-red-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                            )}
                          >
                            Annual
                          </button>
                        </div>
                      </div>
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={projectionData.data}>
                            <defs>
                              <linearGradient id="colorSal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={activeSim.color} stopOpacity={0.2}/>
                                <stop offset="95%" stopColor={activeSim.color} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                            <XAxis 
                              dataKey="timestamp" 
                              type="number"
                              domain={['dataMin', 'dataMax']}
                              ticks={projectionData.ticks}
                              tickFormatter={(val) => {
                                const d = new Date(val);
                                return `FY${(d.getFullYear() + 1).toString().slice(-2)}`;
                              }}
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fill: '#64748b' }} 
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fill: '#64748b' }}
                              tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                              domain={['auto', 'auto']}
                            />
                            <Tooltip 
                              content={<CustomTooltip />} 
                              offset={20}
                              position={{ y: 0 }}
                              wrapperStyle={{ zIndex: 1000 }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey={activeSim.id} 
                              name={activeSim.name}
                              stroke={activeSim.color} 
                              strokeWidth={3}
                              fillOpacity={1} 
                              fill="url(#colorSal)" 
                              connectNulls={true}
                              dot={(props: any) => {
                                const { cx, cy, payload } = props;
                                const isEvent = payload[`${activeSim.id}_isEvent`];
                                if (isEvent) {
                                  return (
                                    <circle key={payload.timestamp} cx={cx} cy={cy} r={6} fill={activeSim.color} stroke="#fff" strokeWidth={2} />
                                  );
                                }
                                return null;
                              }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <p className="mt-4 text-[10px] text-slate-500 italic">
                        * Historical and projected {payMode === 'annual' ? 'annual' : 'bi-weekly'} salaries based on CBA schedules.
                      </p>
                    </section>
                  </div>
                </div>
              ) : viewMode === 'compare' ? (
                /* Comparison View */
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-100">Simulation Comparison</h2>
                  </div>

                  <section className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <BarChart3 size={16} className="text-red-500" />
                        Salary Comparison ({payMode === 'annual' ? 'Annual' : 'Bi-Weekly'})
                      </h3>
                      <div className="flex items-center gap-4">
                        {/* Pay Mode Toggle */}
                        <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
                          <button 
                            onClick={() => setPayMode('biweekly')}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                              payMode === 'biweekly' ? "bg-red-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                            )}
                          >
                            Bi-Weekly
                          </button>
                          <button 
                            onClick={() => setPayMode('annual')}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                              payMode === 'annual' ? "bg-red-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                            )}
                          >
                            Annual
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="h-[400px] w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={projectionData.data}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                          <XAxis 
                            dataKey="timestamp" 
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            ticks={projectionData.ticks}
                            tickFormatter={(val) => {
                              const d = new Date(val);
                              return `FY${(d.getFullYear() + 1).toString().slice(-2)}`;
                            }}
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#64748b' }} 
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#64748b' }}
                            tickFormatter={(v) => `$${v.toLocaleString()}`}
                            domain={['auto', 'auto']}
                          />
                          <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                          <Legend 
                            iconType="circle" 
                            payload={sortedSimsForChart.map(sim => ({
                              id: sim.id,
                              type: 'circle',
                              value: sim.name,
                              color: sim.color
                            }))}
                          />
                          {sortedSimsForChart.map((sim) => {
                            return (
                              <Line 
                                key={sim.id}
                                type="monotone" 
                                dataKey={sim.id} 
                                name={sim.name}
                                stroke={sim.color} 
                                strokeWidth={3}
                                connectNulls={true}
                                dot={(props: any) => {
                                  const { cx, cy, payload } = props;
                                  const isEvent = payload[`${sim.id}_isEvent`];
                                  if (isEvent) {
                                    return (
                                      <circle key={payload.timestamp} cx={cx} cy={cy} r={6} fill={sim.color} stroke="#fff" strokeWidth={2} />
                                    );
                                  }
                                  return <circle key={payload.timestamp} cx={cx} cy={cy} r={3} fill={sim.color} />;
                                }}
                                activeDot={{ r: 8 }}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                  </section>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sims.map(sim => {
                      const sal = calculateSalary(sim, new Date(), escalators);
                      // Find highest rank
                      const allRanks = [sim.rank, ...sim.careerEvents.map(e => e.rank)];
                      const highestRank = allRanks.reduce((prev, curr) => {
                        const prevPay = BASE_PAY_STRUCTURE[prev].steps[BASE_PAY_STRUCTURE[prev].steps.length - 1].biweekly;
                        const currPay = BASE_PAY_STRUCTURE[curr].steps[BASE_PAY_STRUCTURE[curr].steps.length - 1].biweekly;
                        return currPay > prevPay ? curr : prev;
                      }, sim.rank);

                      return (
                        <div key={sim.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sim.color }} />
                              <h4 className="font-bold text-slate-100">{sim.name}</h4>
                            </div>
                            <span className="text-[10px] font-black px-2 py-1 bg-slate-800 rounded-lg text-slate-400 uppercase tracking-wider">
                              {highestRank.split(',')[0]}
                            </span>
                          </div>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <BreakdownRow label="Base Pay" value={payMode === 'annual' ? sal.base * 26 : sal.base} />
                              <BreakdownRow label="Longevity" value={payMode === 'annual' ? sal.longevity * 26 : sal.longevity} />
                              <div className="space-y-2">
                                <BreakdownRow label="Incentives & Certs" value={payMode === 'annual' ? sal.incentives * 26 : sal.incentives} />
                                {sal.incentiveBreakdown.length > 0 && (
                                  <div className="pl-4 space-y-1">
                                    {sal.incentiveBreakdown.map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-[10px]">
                                        <span className="text-slate-500">{item.label}</span>
                                        <span className="text-slate-400 font-mono">${(payMode === 'annual' ? item.value * 26 : item.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-100">Total {payMode === 'annual' ? 'Annual' : 'Bi-Weekly'}</span>
                              <span className="text-base font-black" style={{ color: sim.color }}>
                                ${(payMode === 'annual' ? sal.annual : sal.biweekly).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
        </div>
      )}
    </main>
      
      {/* Footer Info - Removed */}
      <footer className="max-w-7xl mx-auto px-4 text-center pb-8">
      </footer>
    </div>
  );
}

function IncentiveToggle({ label, active, onChange }: { label: string, active: boolean, onChange: (v: boolean) => void }) {
  return (
    <button 
      onClick={() => onChange(!active)}
      className={cn(
        "flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-left",
        active 
          ? "bg-red-950/30 border-red-500/50 text-red-400 shadow-sm" 
          : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
      )}
    >
      <span className="text-xs font-bold truncate">{label}</span>
      <div className={cn(
        "w-2 h-2 rounded-full",
        active ? "bg-red-500 animate-pulse" : "bg-slate-700"
      )} />
    </button>
  );
}

function ResultCard({ title, value, icon, color }: { title: string, value: string, icon: ReactNode, color: string }) {
  return (
    <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", color)}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-xl font-black text-slate-100">{value}</p>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string, value: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-mono font-bold text-slate-200">
        ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}
