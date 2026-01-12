# 🧠 NeuroData Hub - Project Plan

## Vision
Democratize neuroscience research by making petabyte-scale brain data accessible, searchable, and understandable to everyone - from curious enthusiasts to cutting-edge researchers.

---

## 📊 Data Acquisition Strategy

### Phase 1: Foundation Data (Month 1-2)
| Source | Priority | Size | How to Get It |
|--------|----------|------|---------------|
| **Human Connectome Project** | 🔴 Critical | 1.2 PB | Register at db.humanconnectome.org, accept DUA, download via Aspera |
| **OpenNeuro** | 🔴 Critical | 50 TB | Use OpenNeuro API (free, open access) |
| **Allen Brain Atlas** | 🟡 High | 100 TB | Allen API (free, open access) |
| **Neurosynth** | 🟡 High | 10 GB | Direct download, CC0 license |

### Phase 2: Enhanced Data (Month 3-4)
| Source | Priority | Size | How to Get It |
|--------|----------|------|---------------|
| **ADNI** | 🟡 High | 20 TB | Apply at adni.loni.usc.edu (free for researchers) |
| **UK Biobank** | 🟠 Medium | 500 TB | Application process, requires approval |
| **ENIGMA** | 🟠 Medium | 200 TB | Collaborative agreement needed |

### Storage Strategy
- **Hot storage** (frequently accessed): Pre-processed summaries, thumbnails, metadata
- **Warm storage** (on-demand): Full resolution scans, connectivity matrices
- **Cold storage** (archive): Raw data, rarely accessed datasets
- **Estimated monthly cost**: ~$2000-5000 for 50TB hot + 500TB cold

---

## 💰 Monetization Tiers

### Free Tier (Hook & Educate)
**Goal**: Build audience, collect emails, create habit
- ✅ Browse 10 papers/month with abstracts
- ✅ View 5 brain regions in 3D explorer
- ✅ Search across all 1000+ studies
- ✅ Educational content & tutorials
- ✅ Basic comparison tool (2 conditions)
- ❌ No downloads, no API, no AI summaries

### Pro Tier - $29/mo ($9/mo students)
**Goal**: Individual researchers, grad students, enthusiasts
- ✅ Unlimited paper access with AI summaries
- ✅ Full 3D brain explorer with all regions
- ✅ Download up to 50 datasets/month
- ✅ API access (1000 calls/month)
- ✅ 25 saved collections
- ✅ Export visualizations
- ✅ Compare unlimited conditions

### Research Tier - $99/mo
**Goal**: Labs, serious researchers, small startups
- ✅ Everything in Pro
- ✅ Bulk downloads (unlimited)
- ✅ API access (10,000 calls/month)
- ✅ Collaboration tools (share with team of 5)
- ✅ Run custom queries across all data
- ✅ Priority data processing
- ✅ Unlimited collections

### Enterprise Tier - $499-2000/mo
**Goal**: Universities, biotech companies, Neuralink-type companies
- ✅ Everything in Research
- ✅ Unlimited API
- ✅ White-label option
- ✅ On-premise deployment available
- ✅ Custom data integrations
- ✅ Dedicated support
- ✅ Training & workshops

---

## 🎯 What Makes It Worth Paying For

### The "Aha" Moments (convert free → paid)

1. **AI Paper Summaries**
   - Free: See abstract only
   - Pro: "Key Finding: This study found that hippocampal volume decreases 2.3% per decade after age 40, with memory decline correlating at r=0.67"

2. **Cross-Study Search**
   - Free: "Found 47 studies about depression"
   - Pro: "Show me all fMRI studies where amygdala activation increased in depression vs controls" → Instant meta-analysis

3. **Interactive 3D Explorer**
   - Free: Static images of 5 regions
   - Pro: Full rotatable brain, click any region, see connectivity, overlay study findings

4. **Pre-Processed Data**
   - Free: Links to raw data (petabytes, unusable)
   - Pro: "Download this 500MB cleaned dataset ready for analysis"

5. **Comparison Tools**
   - Free: Compare 2 conditions
   - Pro: "Compare brain changes across: Alzheimer's vs Parkinson's vs Healthy Aging"

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│   Next.js + React + Three.js (3D brain) + Tailwind          │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                         API Layer                            │
│   Next.js API Routes + Supabase Edge Functions              │
└─────────────────────────────────────────────────────────────┘
                              │
┌──────────────────┬──────────────────┬───────────────────────┐
│    Supabase      │   AI Services    │    Data Storage       │
│  - Auth          │  - Gemini/GPT    │  - S3 (datasets)      │
│  - PostgreSQL    │  - Paper summary │  - CloudFront (CDN)   │
│  - RLS           │  - Search        │  - Glacier (archive)  │
└──────────────────┴──────────────────┴───────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Background Agents                         │
│   - Data Fetcher (sync from sources)                        │
│   - AI Enricher (summarize papers, extract findings)        │
│   - Quality Checker (validate data, flag issues)            │
│   - Usage Tracker (quotas, billing)                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📅 Development Roadmap

### Week 1-2: Foundation
- [ ] Set up Supabase with neuro-schema
- [ ] Create basic data models and types
- [ ] Build authentication flow
- [ ] Implement subscription tiers (Stripe)

### Week 3-4: Data Ingestion
- [ ] Build HCP sync agent
- [ ] Build OpenNeuro sync agent
- [ ] Create data transformation pipeline
- [ ] Set up S3 storage structure

### Week 5-6: Core Features
- [ ] Study search and browse
- [ ] Paper detail page with abstract
- [ ] Basic brain region viewer
- [ ] User collections

### Week 7-8: Premium Features
- [ ] AI paper summarization
- [ ] 3D brain explorer (Three.js)
- [ ] Dataset download system
- [ ] API for developers

### Week 9-10: Polish & Launch
- [ ] Stripe integration complete
- [ ] Onboarding flow
- [ ] Email sequences
- [ ] Landing page
- [ ] Beta launch

---

## 💵 Revenue Projections

### Conservative Scenario (Year 1)
| Tier | Users | Monthly Revenue |
|------|-------|-----------------|
| Free | 5,000 | $0 |
| Pro | 200 | $5,800 |
| Research | 30 | $2,970 |
| Enterprise | 2 | $2,000 |
| **Total** | 5,232 | **$10,770/mo** |

### Optimistic Scenario (Year 1)
| Tier | Users | Monthly Revenue |
|------|-------|-----------------|
| Free | 20,000 | $0 |
| Pro | 1,000 | $29,000 |
| Research | 100 | $9,900 |
| Enterprise | 10 | $10,000 |
| **Total** | 21,110 | **$48,900/mo** |

---

## 🎯 Target Audiences

1. **Graduate Students** (largest segment)
   - Need: Access papers, understand methods
   - Pain: Can't afford journal subscriptions
   - Hook: Student discount ($9/mo)

2. **Academic Researchers**
   - Need: Compare findings, download data
   - Pain: Wasting time processing raw data
   - Hook: Pre-processed datasets

3. **Biotech Startups**
   - Need: Build products on brain data
   - Pain: Don't have data science teams
   - Hook: API access, bulk downloads

4. **Science Educators**
   - Need: Teach neuroscience visually
   - Pain: Outdated textbook images
   - Hook: 3D explorer, embed widgets

5. **Curious Public**
   - Need: Understand their brain
   - Pain: Research is inaccessible
   - Hook: Plain English summaries

---

## 🚀 Go-to-Market Strategy

### Phase 1: Build Authority (Month 1-3)
- Write blog posts explaining brain research in plain English
- Share visualizations on Twitter/X
- Post in r/neuroscience, r/cogsci
- Create YouTube explainer videos

### Phase 2: Beta Launch (Month 4)
- Invite-only access
- 100 beta users from email list
- Collect feedback aggressively
- Iterate on features

### Phase 3: Public Launch (Month 5)
- Product Hunt launch
- Hacker News post
- Reach out to neuroscience podcasts
- Academic conference presentations

### Phase 4: Growth (Month 6+)
- SEO for neuroscience terms
- Partnerships with universities
- Academic institution sales
- Content marketing at scale

---

## 🔑 Key Success Metrics

1. **Acquisition**: Free signups per week
2. **Activation**: % who search within first session
3. **Retention**: Weekly active users
4. **Revenue**: MRR, conversion rate free→paid
5. **Referral**: NPS score, shares

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Data licensing issues | Only use clearly licensed data (HCP, OpenNeuro are safe) |
| High storage costs | Use tiered storage, lazy-load large files |
| Competition from free tools | Focus on UX, AI summaries, pre-processing |
| Low conversion | A/B test paywall placement, add more premium features |
| Technical complexity | Start small, iterate, use managed services |

---

## 📝 Next Steps

1. **Today**: Set up Supabase with neuro-schema.sql
2. **This week**: Build basic study browser
3. **Next week**: Integrate first data source (OpenNeuro - easiest)
4. **Week 3**: Add Stripe subscriptions
5. **Week 4**: Launch to 10 beta users
