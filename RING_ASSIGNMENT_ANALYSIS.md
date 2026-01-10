# Ring Assignment System Analysis

## Current Understanding

### Problem Statement
A martial arts tournament needs to assign participants to competition rings. Participants compete in two events:
- **Forms** (individual kata/patterns)
- **Sparring** (fighting)

Usually a participant is in the **same ring** for both events. The goal is to group similar participants (age, gender, skill level) together into manageable ring sizes (typically 8-16 people per ring).

### Current System Flow

The current system has 5-6 distinct steps:

1. **Import Data** - Load participants from Excel
2. **Configuration** - Set up divisions and number of physical rings per division
3. **Cohort Management** - Create cohorts by selecting ages and genders
4. **Ring Assignment** - Auto-distribute cohort members across rings (R1, R2, R3...)
5. **Ring Map Editor** - Map "cohort rings" (like "Male 8-10_R1") to "physical rings" (like "PR1")
6. **Order Rings** - Set the competition order within each ring

### Current Terminology

| Term | Current Usage | Potential Confusion |
|------|---------------|---------------------|
| **Division** | Skill level (Black Belt, Level 1, etc.) | Clear ✓ |
| **Cohort** | A group of similar participants (same age range + gender) | Technical term, not intuitive for tournament organizers |
| **Cohort Ring** | A subdivision of a cohort when there are too many people (R1, R2) | Very confusing - sounds like a physical location |
| **Physical Ring** | The actual ring on the floor (PR1, PR2) | Could be just "Ring" |
| **Competition Ring** | Internal term combining cohort + ring number | Users never see this directly |

---

## Problems with Current Approach

### 1. Too Many Steps
Users must navigate: Import → Configuration → Cohorts → Rings → Ring Map → Order. That's 6 steps with different mental models.

### 2. Confusing Terminology
- "Cohort" is academic jargon - tournament directors think in terms of "brackets" or "groups"
- "Cohort Ring" vs "Physical Ring" is confusing - both have "ring" in the name
- Users ask "which ring is this person in?" and the answer is complex ("they're in cohort 'Male 8-10' ring R2, which is mapped to physical ring PR3")

### 3. Separation of Cohort and Ring Assignment
Why are these separate steps? From a user's perspective:
- "I want to group 8-10 year old boys together"
- "There are 24 of them, so split them into 2-3 rings"
- "Put them in Ring 1, Ring 2, and Ring 3"

This is one logical operation, not three separate tabs.

### 4. The "numRings per Division" Configuration Problem
The Configuration tab asks users to specify how many rings each division needs. But this is actually determined by:
- How many participants are in each cohort
- The ideal ring size (8-16 people)

Users set this number wrong because they don't yet know how many cohorts they'll create.

### 5. Forms/Sparring Separation Complexity
The system maintains separate assignments for forms and sparring, but in 95% of cases, they're identical. The UI complexity for handling the 5% edge case burdens everyone.

---

## Alternative Approaches

### Alternative A: "Groups" → "Rings" (Two-Step Approach)

**Concept:** Collapse cohorts and ring assignment into one step. Use "Group" instead of "Cohort."

**Flow:**
1. **Import Data** - Same as now
2. **Configuration** - Only set divisions (remove ring count from here)
3. **Create Groups & Assign Rings** (merged step)
   - Select division, gender(s), age range
   - System shows matching participants and suggests ring count
   - User confirms: "Create 2 rings for 8-10 Boys"
   - Directly assigns to Ring 1, Ring 2 (not abstract R1, R2)
4. **Order Rings** - Same as now
5. **Print** - Same as now

**Terminology Changes:**
| Old | New |
|-----|-----|
| Cohort | Group |
| Cohort Ring (R1, R2) | (eliminated - just part of group creation) |
| Physical Ring (PR1) | Ring 1 |
| Ring Map Editor | (eliminated - assignment happens during group creation) |

**Pros:**
- Fewer steps (3 instead of 6)
- Natural language: "8-10 Boys Group" instead of "Male 8-10 Cohort"
- No confusing "ring" terminology collision

**Cons:**
- Less flexible for advanced use cases
- Harder to re-map rings if floor layout changes

---

### Alternative B: "Brackets" with Auto-Assignment

**Concept:** Use familiar tournament bracket terminology. Minimize manual steps.

**Flow:**
1. **Import Data** - Same as now
2. **Setup Brackets** (automated)
   - System analyzes participants and auto-generates brackets
   - Uses configured rules (age spans, gender mixing, ring sizes)
   - Shows preview: "We created 14 brackets for Black Belt division"
   - User can adjust/split/merge brackets as needed
3. **Assign to Rings** (single screen)
   - Simple drag-drop or number input: "Bracket 'Boys 8-10' → Ring 3"
   - Visual grid showing which brackets go to which rings
4. **Order & Print** - Same as now

**Terminology Changes:**
| Old | New |
|-----|-----|
| Cohort | Bracket |
| Cohort Ring (R1, R2) | Bracket Section (or just numbered) |
| Physical Ring (PR1) | Ring 3 |
| Ring Assignment | (part of bracket creation) |

**Pros:**
- Familiar term for martial arts tournaments
- Automation reduces manual work
- Visual ring-to-bracket mapping

**Cons:**
- "Bracket" implies tournament tree (single elimination), may confuse forms events
- Requires good default rules

---

### Alternative C: "Categories" with Wizard Flow

**Concept:** Use "Category" (common in international tournaments). Guide user through wizard.

**Flow:**
1. **Import Data** - Same as now
2. **Setup Wizard:**
   - Step 1: "How do you want to group participants?" 
     - Options: By age range only, by age + gender, custom
   - Step 2: "What age ranges?" 
     - Presets: "8-10, 11-12, 13-17, 18+" or custom
   - Step 3: System shows generated categories and ring counts
   - Step 4: User assigns categories to physical rings
3. **Review & Adjust** - Single screen showing all assignments
4. **Order & Print** - Same as now

**Terminology Changes:**
| Old | New |
|-----|-----|
| Cohort | Category |
| Cohort Ring (R1, R2) | Category Part 1, Part 2 |
| Physical Ring (PR1) | Ring 1 |
| Division | Division (unchanged) |

**Pros:**
- Wizard guides new users
- "Category" is neutral and internationally understood
- Flexibility preserved through "custom" options

**Cons:**
- Wizards can feel slow for experienced users
- More UI to build

---

### Alternative D: "Just Tell Me the Ring" (Minimal Model)

**Concept:** Radically simplify. Each participant just has a "Ring" field.

**Data Model:**
```
Participant:
  - name, age, gender, school
  - division: "Black Belt"
  - ring: "Ring 3"  // Single field!
  - formsOrder: 5
  - sparringOrder: 5
```

**Flow:**
1. **Import Data** - Same as now
2. **Auto-Assign Rings** 
   - One button: "Auto-assign all participants to rings"
   - Uses smart rules: similar ages, same gender, target 8-16 per ring
   - Each division gets its own Ring 1, Ring 2, etc.
3. **Review & Adjust**
   - Table view with all participants
   - Ring column is editable dropdown
   - Bulk edit: "Move all selected to Ring 4"
4. **Order & Print** - Same as now

**Terminology Changes:**
| Old | New |
|-----|-----|
| Cohort | (eliminated) |
| Cohort Ring | (eliminated) |
| Physical Ring | Ring |
| numRings in Configuration | (eliminated - auto-detected) |

**Pros:**
- Simplest possible model
- "What ring is John in?" → "Ring 3" (not "Cohort Male 8-10 Ring R2 mapped to PR3")
- Easy bulk adjustments

**Cons:**
- Loses ability to manage groups conceptually
- Harder to see patterns ("all 8-10 boys are in Ring 3")
- May need more manual intervention if auto-assign isn't perfect

---

## Recommended Terminology Changes

Regardless of which approach is taken, these terminology changes would help:

| Current Term | Recommended | Rationale |
|--------------|-------------|-----------|
| **Cohort** | **Group** or **Category** | "Cohort" is academic; "Group" is everyday English |
| **Cohort Ring (R1, R2)** | **Sub-ring** or **Section** | Clarifies it's a subdivision, not a physical location |
| **Physical Ring (PR1)** | **Ring 1** or **Floor Ring 1** | "Physical" is redundant; just use the number |
| **Ring Map** | **Ring Assignments** or **Ring Layout** | "Map" sounds technical |
| **Competition Ring** | (eliminate term) | Internal implementation detail |
| **numRings (per division)** | (eliminate setting) | Should be calculated, not configured |

---

## Recommended Next Steps

1. **User Research:** Talk to 2-3 tournament directors about their mental model. Ask them to describe how they currently assign people to rings on paper.

2. **Pick Simplest Model That Works:** Alternative D is the simplest, but may not preserve important grouping visibility. Alternative A is a good middle ground.

3. **Prototype Terminology:** Even without code changes, update labels in the UI to test if new terminology makes more sense.

4. **Consider Progressive Disclosure:** Show the simple flow by default, but have an "Advanced" mode for edge cases (different forms/sparring rings, alt rings for sparring splits).

---

## Summary Matrix

| Approach | Steps | Learning Curve | Flexibility | Matches Mental Model |
|----------|-------|----------------|-------------|---------------------|
| Current | 6 | High | High | Low |
| A: Groups → Rings | 3 | Low | Medium | High |
| B: Brackets + Auto | 4 | Low | Medium | High |
| C: Categories + Wizard | 4 | Low | High | Medium |
| D: Just Rings | 3 | Very Low | Low | Very High |

**Recommendation:** Start with **Alternative A** (Groups → Rings) or **Alternative D** (Just Rings) as they most closely match how tournament directors think about the problem.
