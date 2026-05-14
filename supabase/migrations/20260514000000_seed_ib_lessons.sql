-- ─────────────────────────────────────────────────────────────────────────────
-- IB Lessons Seed Migration
-- Fixes: LESSON_COMPLETE signal not advancing current_lesson_code for IB students.
-- Root cause: route.ts looks up lesson rows in the `lessons` table to get the
-- authoritative next_lesson_code and lesson_name. Table had no IB rows.
--
-- Safe to re-run: INSERT ... ON CONFLICT (lesson_code) DO NOTHING
-- Run manually in the Supabase SQL Editor — do NOT use the Supabase CLI.
--
-- Columns populated: lesson_code, lesson_name, unit_code, unit_name, next_lesson_code
-- No subject column assumed (lesson_code prefix disambiguates IB_ECON vs IB_BM).
--
-- unit_code format: subject-prefixed to match student_progress.current_unit_code
--   IB Economics rows  → IB_ECON_UNIT_1, IB_ECON_UNIT_2, IB_ECON_UNIT_3, IB_ECON_UNIT_4
--   IB Business rows   → IB_BM_UNIT_1, IB_BM_UNIT_2, IB_BM_UNIT_3, IB_BM_UNIT_4, IB_BM_UNIT_5
--
-- ── LESSON COUNT NOTE (do not run without Grant confirming) ──────────────────
-- IB Economics: 156 lessons  IB_ECON_001 → IB_ECON_156 → NULL
--   This uses compressed sequential codes (001–156) derived from the curriculum
--   outline. The IB Economics system prompt states lesson plan ranges up to
--   lesson 210 (Unit 1: 1–13, Unit 2: 14–89, Unit 3: 90–147, Unit 4: 152–210).
--   156 ≠ 210. Grant must confirm whether 156 custom codes are acceptable or
--   whether the seed must match the plan numbers (001–210, with lesson names for
--   all 210 rows). The 128 figure cited in earlier discussion was speculation
--   with no backing curriculum map — it is not authoritative.
--   UNIT_1 Introduction to Economics          IB_ECON_001–013  (13 lessons)
--   UNIT_2 Microeconomics                     IB_ECON_014–081  (68 lessons)
--   UNIT_3 Macroeconomics                     IB_ECON_082–122  (41 lessons)
--   UNIT_4 The Global Economy                 IB_ECON_123–156  (34 lessons)
--
-- IB Business Management: 59 lessons  IB_BM_001 → IB_BM_059 → NULL
--   UNIT_1 Business Organisation and Env      IB_BM_001–012    (12 lessons)
--   UNIT_2 Human Resource Management          IB_BM_013–022    (10 lessons)
--   UNIT_3 Finance and Accounts               IB_BM_023–035    (13 lessons)
--   UNIT_4 Marketing                          IB_BM_036–051    (16 lessons)
--   UNIT_5 Operations Management              IB_BM_052–059    ( 8 lessons)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── IB ECONOMICS ─────────────────────────────────────────────────────────────

INSERT INTO lessons (lesson_code, lesson_name, unit_code, unit_name, next_lesson_code) VALUES

-- UNIT 1: Introduction to Economics  (IB_ECON_001 – IB_ECON_013)
('IB_ECON_001', 'Economics as a Social Science',                                          'IB_ECON_UNIT_1', 'Introduction to Economics', 'IB_ECON_002'),
('IB_ECON_002', 'Microeconomics and Macroeconomics',                                      'IB_ECON_UNIT_1', 'Introduction to Economics', 'IB_ECON_003'),
('IB_ECON_003', 'The Nine Key Concepts',                                                  'IB_ECON_UNIT_1', 'Introduction to Economics', 'IB_ECON_004'),
('IB_ECON_004', 'Factors of Production',                                                  'IB_ECON_UNIT_1', 'Introduction to Economics', 'IB_ECON_005'),
('IB_ECON_005', 'Scarcity, Opportunity Cost and Economic Choice',                         'IB_ECON_UNIT_1', 'Introduction to Economics', 'IB_ECON_006'),
('IB_ECON_006', 'Economic Systems',                                                       'IB_ECON_UNIT_1', 'Introduction to Economics', 'IB_ECON_007'),
('IB_ECON_007', 'The Production Possibility Curve',                                      'IB_ECON_UNIT_1', 'Introduction to Economics', 'IB_ECON_008'),
('IB_ECON_008', 'Shifts of the PPC and Economic Growth',                                 'IB_ECON_UNIT_1', 'Introduction to Economics', 'IB_ECON_009'),
('IB_ECON_009', 'The Circular Flow of Income',                                           'IB_ECON_UNIT_1', 'Introduction to Economics', 'IB_ECON_010'),
('IB_ECON_010', 'Government, Banks and the Foreign Sector in the Circular Flow',         'IB_ECON_UNIT_1', 'Introduction to Economics', 'IB_ECON_011'),
('IB_ECON_011', 'Positive and Normative Economics',                                      'IB_ECON_UNIT_1', 'Introduction to Economics', 'IB_ECON_012'),
('IB_ECON_012', 'Ceteris Paribus and Economic Methodology',                              'IB_ECON_UNIT_1', 'Introduction to Economics', 'IB_ECON_013'),
('IB_ECON_013', 'History of Economic Thought',                                           'IB_ECON_UNIT_1', 'Introduction to Economics', 'IB_ECON_014'),

-- UNIT 2: Microeconomics  (IB_ECON_014 – IB_ECON_081)
-- 2.1 Demand
('IB_ECON_014', 'The Law of Demand and the Demand Curve',                                'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_015'),
('IB_ECON_015', 'Non-Price Determinants of Demand',                                      'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_016'),
('IB_ECON_016', 'Movements Along and Shifts of the Demand Curve',                        'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_017'),
('IB_ECON_017', '[HL] Income and Substitution Effects',                                  'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_018'),
('IB_ECON_018', '[HL] The Law of Diminishing Marginal Utility',                          'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_019'),
-- 2.2 Supply
('IB_ECON_019', 'The Law of Supply and the Supply Curve',                                'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_020'),
('IB_ECON_020', 'Non-Price Determinants of Supply',                                      'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_021'),
('IB_ECON_021', 'Movements Along and Shifts of the Supply Curve',                        'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_022'),
('IB_ECON_022', '[HL] The Law of Diminishing Marginal Returns',                          'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_023'),
('IB_ECON_023', '[HL] Increasing Marginal Costs',                                        'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_024'),
-- 2.3 Competitive Market Equilibrium
('IB_ECON_024', 'Market Equilibrium',                                                    'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_025'),
('IB_ECON_025', 'Excess Demand and Excess Supply',                                       'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_026'),
('IB_ECON_026', 'Functions of the Price Mechanism',                                      'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_027'),
('IB_ECON_027', 'Consumer and Producer Surplus',                                         'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_028'),
('IB_ECON_028', 'Social Surplus and Allocative Efficiency (MB = MC)',                    'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_029'),
('IB_ECON_029', '[HL] Calculating Surplus Areas from Diagrams',                          'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_030'),
-- 2.4 Critique of Maximising Behaviour (HL Only)
('IB_ECON_030', '[HL] Rational Consumer Assumptions and Behavioural Economics',          'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_031'),
('IB_ECON_031', '[HL] Behavioural Biases — Anchoring, Framing and Availability',        'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_032'),
('IB_ECON_032', '[HL] Bounded Rationality and Imperfect Information',                    'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_033'),
('IB_ECON_033', '[HL] Choice Architecture — Default, Restricted and Mandated Choices',  'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_034'),
('IB_ECON_034', '[HL] Business Objectives Beyond Profit',                                'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_035'),
-- 2.5 Elasticities of Demand
('IB_ECON_035', 'Price Elasticity of Demand — Formula, Degrees and Diagrams',           'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_036'),
('IB_ECON_036', 'Determinants of PED',                                                   'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_037'),
('IB_ECON_037', 'PED and Total Revenue',                                                 'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_038'),
('IB_ECON_038', '[HL] PED Along a Straight-Line Demand Curve',                          'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_039'),
('IB_ECON_039', '[HL] PED for Primary Commodities vs Manufactured Products',            'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_040'),
('IB_ECON_040', 'Income Elasticity of Demand',                                           'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_041'),
('IB_ECON_041', 'YED and the Engel Curve — Necessities vs Luxuries',                    'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_042'),
('IB_ECON_042', '[HL] YED and Sectoral Structural Change',                               'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_043'),
('IB_ECON_043', 'Cross-Price Elasticity of Demand',                                      'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_044'),
-- 2.6 Elasticity of Supply
('IB_ECON_044', 'Price Elasticity of Supply — Formula, Degrees and Determinants',       'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_045'),
('IB_ECON_045', '[HL] PES for Primary Commodities vs Manufactured Products',            'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_046'),
-- 2.7 Role of Government in Microeconomics
('IB_ECON_046', 'Reasons for Government Intervention',                                   'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_047'),
('IB_ECON_047', 'Price Ceilings',                                                        'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_048'),
('IB_ECON_048', 'Price Floors',                                                          'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_049'),
('IB_ECON_049', 'Indirect Taxes',                                                        'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_050'),
('IB_ECON_050', 'Subsidies',                                                             'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_051'),
('IB_ECON_051', 'Direct Provision and Regulation',                                       'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_052'),
('IB_ECON_052', '[HL] Consumer Nudges as a Policy Tool',                                 'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_053'),
('IB_ECON_053', '[HL] Calculations — Price Controls',                                   'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_054'),
('IB_ECON_054', '[HL] Calculations — Indirect Taxes and Subsidies',                     'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_055'),
-- 2.8 Market Failure — Externalities and Common Pool Resources
('IB_ECON_055', 'Socially Optimum Output and Externalities',                             'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_056'),
('IB_ECON_056', 'Negative Production Externalities',                                     'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_057'),
('IB_ECON_057', 'Negative Consumption Externalities',                                    'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_058'),
('IB_ECON_058', 'Positive Production Externalities',                                     'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_059'),
('IB_ECON_059', 'Positive Consumption Externalities',                                    'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_060'),
('IB_ECON_060', 'Demerit Goods and Merit Goods',                                         'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_061'),
('IB_ECON_061', 'Common Pool Resources and the Tragedy of the Commons',                  'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_062'),
('IB_ECON_062', '[HL] Welfare Loss Calculations from Externality Diagrams',              'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_063'),
('IB_ECON_063', 'Government Responses — Pigouvian Taxes and Carbon Taxes',              'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_064'),
('IB_ECON_064', 'Government Responses — Tradable Permits and Regulation',               'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_065'),
('IB_ECON_065', 'Government Responses — Education, Direct Provision and International Cooperation', 'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_066'),
('IB_ECON_066', 'Evaluation of Externality Policies',                                   'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_067'),
-- 2.9 Market Failure — Public Goods
('IB_ECON_067', 'Public Goods and the Free Rider Problem',                               'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_068'),
('IB_ECON_068', 'Direct Provision vs Contracting Out of Public Goods',                  'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_069'),
-- 2.10 Market Failure — Asymmetric Information (HL Only)
('IB_ECON_069', '[HL] Adverse Selection and Moral Hazard',                               'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_070'),
('IB_ECON_070', '[HL] Government Responses to Asymmetric Information',                  'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_071'),
-- 2.11 Market Failure — Market Power (HL Only)
('IB_ECON_071', '[HL] Perfect Competition — Characteristics and Short-Run Equilibrium', 'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_072'),
('IB_ECON_072', '[HL] Perfect Competition — Long-Run Equilibrium and Allocative Efficiency', 'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_073'),
('IB_ECON_073', '[HL] Rational Producer Behaviour — TR–TC and MC = MR',                 'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_074'),
('IB_ECON_074', '[HL] Monopoly — Characteristics and Profit Maximisation',              'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_075'),
('IB_ECON_075', '[HL] Monopoly — Allocative Inefficiency, Welfare Loss and Natural Monopoly', 'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_076'),
('IB_ECON_076', '[HL] Oligopoly — Interdependence, Collusion and Game Theory',          'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_077'),
('IB_ECON_077', '[HL] Monopolistic Competition — Short-Run and Long-Run Equilibrium',   'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_078'),
('IB_ECON_078', '[HL] Advantages of Market Power and Government Responses',             'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_079'),
('IB_ECON_079', '[HL] Calculations — Profit, MC, MR, AC and AR from Data',             'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_080'),
-- 2.12 Market Inability to Achieve Equity (HL Only)
('IB_ECON_080', '[HL] Free Market Outcomes and Unequal Income Distribution',            'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_081'),
('IB_ECON_081', 'Unit 2 Review and Checkpoint',                                          'IB_ECON_UNIT_2', 'Microeconomics', 'IB_ECON_082'),

-- UNIT 3: Macroeconomics  (IB_ECON_082 – IB_ECON_122)
-- 3.1 Measuring Economic Activity
('IB_ECON_082', 'National Income Accounting and Nominal GDP',                            'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_083'),
('IB_ECON_083', 'Real GDP, GNI and Per Capita Measures',                                 'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_084'),
('IB_ECON_084', 'Purchasing Power Parity (PPP)',                                         'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_085'),
('IB_ECON_085', 'The Business Cycle',                                                    'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_086'),
('IB_ECON_086', 'GDP Limitations and Alternative Well-Being Measures',                  'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_087'),
-- 3.2 Aggregate Demand and Aggregate Supply
('IB_ECON_087', 'The Aggregate Demand Curve',                                            'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_088'),
('IB_ECON_088', 'Components and Determinants of Aggregate Demand',                       'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_089'),
('IB_ECON_089', 'Short-Run Aggregate Supply',                                            'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_090'),
('IB_ECON_090', 'Keynesian AS and the Monetarist LRAS',                                  'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_091'),
('IB_ECON_091', 'Macroeconomic Equilibrium — Short Run',                                'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_092'),
('IB_ECON_092', 'Macroeconomic Equilibrium — Long Run',                                 'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_093'),
('IB_ECON_093', 'Inflationary and Deflationary Gaps',                                   'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_094'),
-- 3.3 Macroeconomic Objectives
('IB_ECON_094', 'Economic Growth — Actual and Potential Growth',                         'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_095'),
('IB_ECON_095', 'Unemployment — Types and Measurement',                                  'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_096'),
('IB_ECON_096', 'The Natural Rate of Unemployment and Its Costs',                        'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_097'),
('IB_ECON_097', 'Inflation — CPI, Demand-Pull and Cost-Push',                           'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_098'),
('IB_ECON_098', 'Deflation, Disinflation and Their Costs',                               'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_099'),
('IB_ECON_099', 'Conflicts Between Macroeconomic Objectives',                            'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_100'),
('IB_ECON_100', '[HL] Sustainable Government Debt',                                      'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_101'),
('IB_ECON_101', '[HL] Short-Run and Long-Run Phillips Curve',                            'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_102'),
('IB_ECON_102', '[HL] Weighted Price Index Calculations',                                'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_103'),
-- 3.4 Economics of Inequality and Poverty
('IB_ECON_103', 'The Lorenz Curve and Gini Coefficient',                                 'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_104'),
('IB_ECON_104', '[HL] Constructing the Lorenz Curve from Quintile Data',                'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_105'),
('IB_ECON_105', 'Absolute vs Relative Poverty; MPI and Measurement',                    'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_106'),
('IB_ECON_106', 'Impact of Inequality on Growth and Social Stability',                  'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_107'),
('IB_ECON_107', 'Taxation — Progressive, Regressive and Proportional',                  'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_108'),
('IB_ECON_108', '[HL] Tax Calculations',                                                 'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_109'),
('IB_ECON_109', 'Policies to Reduce Poverty and Inequality',                             'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_110'),
-- 3.5 Demand Management — Monetary Policy
('IB_ECON_110', 'The Central Bank and Goals of Monetary Policy',                         'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_111'),
('IB_ECON_111', '[HL] Money Creation by Commercial Banks',                               'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_112'),
('IB_ECON_112', '[HL] Tools of Monetary Policy and Money Market Equilibrium',            'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_113'),
('IB_ECON_113', 'Real vs Nominal Interest Rates and Monetary Policy',                   'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_114'),
('IB_ECON_114', 'Effectiveness of Monetary Policy',                                      'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_115'),
-- 3.6 Demand Management — Fiscal Policy
('IB_ECON_115', 'Government Revenue and Expenditure; Goals of Fiscal Policy',           'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_116'),
('IB_ECON_116', 'Expansionary and Contractionary Fiscal Policy',                         'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_117'),
('IB_ECON_117', '[HL] The Keynesian Multiplier — Formula and Calculations',             'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_118'),
('IB_ECON_118', '[HL] Crowding Out and Automatic Stabilisers',                           'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_119'),
('IB_ECON_119', 'Effectiveness of Fiscal Policy',                                        'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_120'),
-- 3.7 Supply-Side Policies
('IB_ECON_120', 'Market-Based and Interventionist Supply-Side Policies',                 'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_121'),
('IB_ECON_121', 'Demand-Side Effects of Supply-Side Policies',                           'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_122'),
('IB_ECON_122', 'Evaluation of Supply-Side Policies',                                    'IB_ECON_UNIT_3', 'Macroeconomics', 'IB_ECON_123'),

-- UNIT 4: The Global Economy  (IB_ECON_123 – IB_ECON_156)
-- 4.1 Benefits of International Trade
('IB_ECON_123', 'The Benefits of Free Trade',                                            'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_124'),
('IB_ECON_124', 'Free Trade Diagrams — Exports and Imports',                            'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_125'),
('IB_ECON_125', '[HL] Absolute and Comparative Advantage',                               'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_126'),
('IB_ECON_126', '[HL] Calculations from Comparative Advantage Data',                    'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_127'),
-- 4.2 Types of Trade Protection
('IB_ECON_127', 'Tariffs and Their Effects',                                             'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_128'),
('IB_ECON_128', 'Import Quotas',                                                         'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_129'),
('IB_ECON_129', 'Export Subsidies and Administrative Barriers',                          'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_130'),
('IB_ECON_130', '[HL] Calculations from Trade Protection Diagrams',                     'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_131'),
-- 4.3 Arguments For and Against Trade Protection
('IB_ECON_131', 'Arguments for Trade Protection',                                        'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_132'),
('IB_ECON_132', 'Arguments Against Trade Protection and Evaluation',                    'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_133'),
-- 4.4 Economic Integration
('IB_ECON_133', 'Preferential Trade Agreements and Trading Blocs',                      'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_134'),
('IB_ECON_134', 'Monetary Union and the WTO',                                           'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_135'),
('IB_ECON_135', '[HL] Trade Creation and Trade Diversion',                               'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_136'),
('IB_ECON_136', '[HL] Monetary Union Evaluation',                                        'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_137'),
-- 4.5 Exchange Rates
('IB_ECON_137', 'Floating Exchange Rates',                                               'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_138'),
('IB_ECON_138', 'Factors Causing Exchange Rate Changes and Their Consequences',         'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_139'),
('IB_ECON_139', 'Fixed and Managed Exchange Rates',                                      'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_140'),
('IB_ECON_140', '[HL] Fixed vs Floating Exchange Rates — Evaluation',                   'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_141'),
-- 4.6 Balance of Payments
('IB_ECON_141', 'The Balance of Payments — Structure and Accounts',                     'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_142'),
('IB_ECON_142', '[HL] Current Account and Exchange Rate Linkage',                        'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_143'),
('IB_ECON_143', '[HL] Persistent Current Account Deficit — Implications and Corrections', 'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_144'),
('IB_ECON_144', '[HL] The Marshall-Lerner Condition and the J-Curve',                   'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_145'),
('IB_ECON_145', '[HL] Persistent Current Account Surplus and Implications',             'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_146'),
-- 4.7 Sustainable Development
('IB_ECON_146', 'The Meaning of Sustainable Development and the 17 SDGs',               'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_147'),
-- 4.8 Measuring Development
('IB_ECON_147', 'Multidimensional Nature of Development and Single Indicators',         'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_148'),
('IB_ECON_148', 'Composite Development Indicators — HDI, GII and Beyond',               'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_149'),
('IB_ECON_149', 'Strengths and Limitations of Development Indicators; Growth vs Development', 'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_150'),
-- 4.9 Barriers to Development
('IB_ECON_150', 'Poverty Traps and Economic Barriers to Development',                   'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_151'),
('IB_ECON_151', 'Political and Social Barriers to Development',                          'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_152'),
-- 4.10 Economic Growth and Development Strategies
('IB_ECON_152', 'Trade Strategies and Diversification',                                  'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_153'),
('IB_ECON_153', 'Market-Based and Interventionist Development Policies',                 'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_154'),
('IB_ECON_154', 'Foreign Direct Investment and Foreign Aid',                             'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_155'),
('IB_ECON_155', 'Multilateral Assistance — World Bank and IMF',                         'IB_ECON_UNIT_4', 'The Global Economy', 'IB_ECON_156'),
('IB_ECON_156', 'Institutional Change, Microfinance and SDG Progress',                  'IB_ECON_UNIT_4', 'The Global Economy', NULL)

ON CONFLICT (lesson_code) DO NOTHING;


-- ── IB BUSINESS MANAGEMENT ───────────────────────────────────────────────────

INSERT INTO lessons (lesson_code, lesson_name, unit_code, unit_name, next_lesson_code) VALUES

-- UNIT 1: Business Organisation and Environment  (IB_BM_001 – IB_BM_012)
('IB_BM_001', 'What is a Business? Sectors, Functions and Types',                        'IB_BM_UNIT_1', 'Business Organisation and Environment', 'IB_BM_002'),
('IB_BM_002', 'Business Objectives and SMART Goals',                                     'IB_BM_UNIT_1', 'Business Organisation and Environment', 'IB_BM_003'),
('IB_BM_003', 'Stakeholders, Ethics and Corporate Social Responsibility',                'IB_BM_UNIT_1', 'Business Organisation and Environment', 'IB_BM_004'),
('IB_BM_004', 'Organisational Structure — Hierarchies and Spans of Control',            'IB_BM_UNIT_1', 'Business Organisation and Environment', 'IB_BM_005'),
('IB_BM_005', 'Delegation, Communication and Organisational Design',                    'IB_BM_UNIT_1', 'Business Organisation and Environment', 'IB_BM_006'),
('IB_BM_006', 'Business Planning and the Business Plan',                                 'IB_BM_UNIT_1', 'Business Organisation and Environment', 'IB_BM_007'),
('IB_BM_007', 'The External Environment — PEST and STEEPLE Analysis',                   'IB_BM_UNIT_1', 'Business Organisation and Environment', 'IB_BM_008'),
('IB_BM_008', 'Internal and External Business Growth',                                   'IB_BM_UNIT_1', 'Business Organisation and Environment', 'IB_BM_009'),
('IB_BM_009', 'Mergers, Acquisitions and Integration Strategies',                        'IB_BM_UNIT_1', 'Business Organisation and Environment', 'IB_BM_010'),
('IB_BM_010', '[HL] Multinational Corporations (MNCs) — Characteristics and Impact',    'IB_BM_UNIT_1', 'Business Organisation and Environment', 'IB_BM_011'),
('IB_BM_011', '[HL] Strategies for International Expansion',                             'IB_BM_UNIT_1', 'Business Organisation and Environment', 'IB_BM_012'),
('IB_BM_012', 'Unit 1 Review and Checkpoint',                                            'IB_BM_UNIT_1', 'Business Organisation and Environment', 'IB_BM_013'),

-- UNIT 2: Human Resource Management  (IB_BM_013 – IB_BM_022)
('IB_BM_013', 'Human Resource Planning',                                                 'IB_BM_UNIT_2', 'Human Resource Management', 'IB_BM_014'),
('IB_BM_014', 'Recruitment and Selection',                                               'IB_BM_UNIT_2', 'Human Resource Management', 'IB_BM_015'),
('IB_BM_015', 'Training and Development',                                                'IB_BM_UNIT_2', 'Human Resource Management', 'IB_BM_016'),
('IB_BM_016', 'Appraisal and Performance Management',                                   'IB_BM_UNIT_2', 'Human Resource Management', 'IB_BM_017'),
('IB_BM_017', 'Motivation Theory — Taylor and Maslow',                                  'IB_BM_UNIT_2', 'Human Resource Management', 'IB_BM_018'),
('IB_BM_018', 'Motivation Theory — Herzberg and Adams',                                 'IB_BM_UNIT_2', 'Human Resource Management', 'IB_BM_019'),
('IB_BM_019', 'Motivation Theory — McClelland and Non-Financial Motivators',            'IB_BM_UNIT_2', 'Human Resource Management', 'IB_BM_020'),
('IB_BM_020', 'Organisational and Corporate Culture',                                    'IB_BM_UNIT_2', 'Human Resource Management', 'IB_BM_021'),
('IB_BM_021', 'Industrial Relations and Conflict Resolution',                            'IB_BM_UNIT_2', 'Human Resource Management', 'IB_BM_022'),
('IB_BM_022', 'Unit 2 Review and Checkpoint',                                            'IB_BM_UNIT_2', 'Human Resource Management', 'IB_BM_023'),

-- UNIT 3: Finance and Accounts  (IB_BM_023 – IB_BM_035)
('IB_BM_023', 'Sources of Finance — Internal Sources',                                  'IB_BM_UNIT_3', 'Finance and Accounts', 'IB_BM_024'),
('IB_BM_024', 'Sources of Finance — External Sources',                                  'IB_BM_UNIT_3', 'Finance and Accounts', 'IB_BM_025'),
('IB_BM_025', 'Costs, Revenues and Profit',                                              'IB_BM_UNIT_3', 'Finance and Accounts', 'IB_BM_026'),
('IB_BM_026', 'Break-Even Analysis',                                                     'IB_BM_UNIT_3', 'Finance and Accounts', 'IB_BM_027'),
('IB_BM_027', 'The Income Statement (Profit and Loss Account)',                          'IB_BM_UNIT_3', 'Finance and Accounts', 'IB_BM_028'),
('IB_BM_028', 'The Balance Sheet',                                                       'IB_BM_UNIT_3', 'Finance and Accounts', 'IB_BM_029'),
('IB_BM_029', 'Cash Flow Statements and Cash Flow Forecasting',                         'IB_BM_UNIT_3', 'Finance and Accounts', 'IB_BM_030'),
('IB_BM_030', 'Profitability Ratios',                                                    'IB_BM_UNIT_3', 'Finance and Accounts', 'IB_BM_031'),
('IB_BM_031', 'Liquidity Ratios',                                                        'IB_BM_UNIT_3', 'Finance and Accounts', 'IB_BM_032'),
('IB_BM_032', '[HL] Efficiency Ratios and Advanced Ratio Analysis',                     'IB_BM_UNIT_3', 'Finance and Accounts', 'IB_BM_033'),
('IB_BM_033', 'Investment Appraisal — Payback Period and ARR',                          'IB_BM_UNIT_3', 'Finance and Accounts', 'IB_BM_034'),
('IB_BM_034', '[HL] Investment Appraisal — Net Present Value (NPV)',                    'IB_BM_UNIT_3', 'Finance and Accounts', 'IB_BM_035'),
('IB_BM_035', 'Unit 3 Review and Checkpoint',                                            'IB_BM_UNIT_3', 'Finance and Accounts', 'IB_BM_036'),

-- UNIT 4: Marketing  (IB_BM_036 – IB_BM_051)
('IB_BM_036', 'Marketing Overview and the Role of Market Research',                     'IB_BM_UNIT_4', 'Marketing', 'IB_BM_037'),
('IB_BM_037', 'Quantitative and Qualitative Market Research Methods',                   'IB_BM_UNIT_4', 'Marketing', 'IB_BM_038'),
('IB_BM_038', 'Market Segmentation, Targeting and Positioning',                         'IB_BM_UNIT_4', 'Marketing', 'IB_BM_039'),
('IB_BM_039', 'The Marketing Mix — Product',                                            'IB_BM_UNIT_4', 'Marketing', 'IB_BM_040'),
('IB_BM_040', 'The Marketing Mix — Price and Pricing Strategies',                       'IB_BM_UNIT_4', 'Marketing', 'IB_BM_041'),
('IB_BM_041', 'The Marketing Mix — Place and Distribution Channels',                    'IB_BM_UNIT_4', 'Marketing', 'IB_BM_042'),
('IB_BM_042', 'The Marketing Mix — Promotion',                                          'IB_BM_UNIT_4', 'Marketing', 'IB_BM_043'),
('IB_BM_043', 'The 7Ps for Services Marketing',                                         'IB_BM_UNIT_4', 'Marketing', 'IB_BM_044'),
('IB_BM_044', 'The Product Life Cycle',                                                  'IB_BM_UNIT_4', 'Marketing', 'IB_BM_045'),
('IB_BM_045', 'The Boston Consulting Group (BCG) Matrix',                               'IB_BM_UNIT_4', 'Marketing', 'IB_BM_046'),
('IB_BM_046', 'Branding, Packaging and Elasticity in Marketing',                        'IB_BM_UNIT_4', 'Marketing', 'IB_BM_047'),
('IB_BM_047', 'E-Commerce and Digital Marketing',                                        'IB_BM_UNIT_4', 'Marketing', 'IB_BM_048'),
('IB_BM_048', 'Social Media Marketing and Guerrilla Marketing',                         'IB_BM_UNIT_4', 'Marketing', 'IB_BM_049'),
('IB_BM_049', '[HL] International Marketing and the Adapted Marketing Mix',             'IB_BM_UNIT_4', 'Marketing', 'IB_BM_050'),
('IB_BM_050', '[HL] Market Entry Strategies for International Markets',                 'IB_BM_UNIT_4', 'Marketing', 'IB_BM_051'),
('IB_BM_051', 'Unit 4 Review and Checkpoint',                                            'IB_BM_UNIT_4', 'Marketing', 'IB_BM_052'),

-- UNIT 5: Operations Management  (IB_BM_052 – IB_BM_059)
('IB_BM_052', 'Operations Planning — Capacity Utilisation and Productivity',            'IB_BM_UNIT_5', 'Operations Management', 'IB_BM_053'),
('IB_BM_053', 'Lean Production — Principles and Benefits',                               'IB_BM_UNIT_5', 'Operations Management', 'IB_BM_054'),
('IB_BM_054', 'Kaizen, Just-in-Time (JIT) and Total Quality Management (TQM)',          'IB_BM_UNIT_5', 'Operations Management', 'IB_BM_055'),
('IB_BM_055', 'Stock and Inventory Management — EOQ and JIT',                           'IB_BM_UNIT_5', 'Operations Management', 'IB_BM_056'),
('IB_BM_056', 'Quality Control and Quality Assurance',                                   'IB_BM_UNIT_5', 'Operations Management', 'IB_BM_057'),
('IB_BM_057', '[HL] Critical Path Analysis (CPA) and Network Diagrams',                 'IB_BM_UNIT_5', 'Operations Management', 'IB_BM_058'),
('IB_BM_058', '[HL] Research and Development in Operations',                             'IB_BM_UNIT_5', 'Operations Management', 'IB_BM_059'),
('IB_BM_059', 'Unit 5 Review and Checkpoint',                                            'IB_BM_UNIT_5', 'Operations Management', NULL)

ON CONFLICT (lesson_code) DO NOTHING;


-- ── CHAIN INTEGRITY VERIFICATION ─────────────────────────────────────────────
-- Run these after the INSERTs to confirm the linked list has no broken pointers.
-- Both queries must return ZERO rows before the fix is considered complete.

-- IB Economics chain check:
WITH chain AS (
  SELECT lesson_code, next_lesson_code FROM lessons WHERE lesson_code LIKE 'IB_ECON_%'
)
SELECT lesson_code, next_lesson_code, 'BROKEN POINTER' AS issue
FROM chain
WHERE next_lesson_code IS NOT NULL
  AND next_lesson_code NOT IN (SELECT lesson_code FROM chain);
-- Expected: 0 rows

-- IB Business Management chain check:
WITH chain AS (
  SELECT lesson_code, next_lesson_code FROM lessons WHERE lesson_code LIKE 'IB_BM_%'
)
SELECT lesson_code, next_lesson_code, 'BROKEN POINTER' AS issue
FROM chain
WHERE next_lesson_code IS NOT NULL
  AND next_lesson_code NOT IN (SELECT lesson_code FROM chain);
-- Expected: 0 rows

-- Row counts (for confirmation):
SELECT 'IB_ECON' AS subject, COUNT(*) AS rows FROM lessons WHERE lesson_code LIKE 'IB_ECON_%'
UNION ALL
SELECT 'IB_BM'   AS subject, COUNT(*) AS rows FROM lessons WHERE lesson_code LIKE 'IB_BM_%';
-- Expected: IB_ECON = 156, IB_BM = 59
