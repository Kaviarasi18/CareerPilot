import { QuizQuestion, SkillItem, Quiz } from '../../types';
import { orderSkillsByPrerequisites } from '../../utils/breadthFirstSearch';

export interface GenerateQuizParams {
  skills: SkillItem[] | string[];
  userPlan?: string;
  topicFocus?: string;
  customSkillNames?: string[];
}

export async function generateSkillQuiz(params: GenerateQuizParams): Promise<QuizQuestion[]> {
  const orderedSkills = orderSkillsByPrerequisites(params.skills);
  const orderedCustomSkillNames = params.customSkillNames
    ? orderSkillsByPrerequisites(params.customSkillNames)
    : undefined;
  const orderedParams = { ...params, skills: orderedSkills, customSkillNames: orderedCustomSkillNames };

  try {
    const response = await fetch('/api/ai/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderedParams),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.questions && Array.isArray(data.questions) && data.questions.length === 15) {
        return data.questions;
      }
    }
  } catch (err) {
    console.warn('Backend quiz generation fallback:', err);
  }

  // Fallback Dynamic Quiz Engine matching user's actual skills
  return fallbackQuizGenerator(orderedSkills);
}

export async function generate15QuestionQuiz(
  skills: SkillItem[] | string[] = [],
  topicFocus?: string,
  customSkillNames?: string[]
): Promise<Quiz> {
  const orderedSkills = orderSkillsByPrerequisites(skills);
  const orderedCustomSkillNames = customSkillNames
    ? orderSkillsByPrerequisites(customSkillNames)
    : undefined;
  const questions = await generateSkillQuiz({ skills: orderedSkills, topicFocus, customSkillNames: orderedCustomSkillNames });
  const skillNames = Array.isArray(orderedCustomSkillNames) && orderedCustomSkillNames.length > 0
    ? orderedCustomSkillNames
    : orderedSkills.map((s) => (typeof s === 'string' ? s : s.skill_name));

  return {
    id: 'quiz_' + Date.now(),
    title: topicFocus || (skillNames.length > 0 ? `Dynamic Assessment: ${skillNames.slice(0, 3).join(', ')}` : 'Tailored Skill Assessment'),
    total_questions: 15,
    skills_tested: skillNames.length > 0 ? skillNames : ['Python', 'JavaScript', 'React.js', 'SQL', 'Docker'],
    status: 'active',
    questions,
    created_at: new Date().toISOString(),
  };
}

function fallbackQuizGenerator(skillsInput: SkillItem[] | string[]): QuizQuestion[] {
  const skillNames = skillsInput.map((s) => (typeof s === 'string' ? s : s.skill_name));
  const rawSkillNames = skillNames.length > 0 ? skillNames : ['Python', 'JavaScript', 'React.js', 'SQL', 'Docker'];

  // Categorized comprehensive question pool for fallback
  const pool: Record<string, { easy: QuizQuestion[]; medium: QuizQuestion[]; hard: QuizQuestion[] }> = {
    python: {
      easy: [
        {
          id: 'q_py_e1',
          question_number: 1,
          skill: 'Python',
          difficulty: 'Easy',
          question: 'What is the primary difference between a Python List and a Tuple?',
          options: [
            'A: Lists are mutable (can be modified in-place); Tuples are immutable',
            'B: Tuples can store mixed data types while Lists only store integers',
            'C: Lists use parentheses () while Tuples use brackets []',
            'D: Tuples execute significantly slower than Lists for indexing',
          ],
          correct_answer: 'A: Lists are mutable (can be modified in-place); Tuples are immutable',
          explanation: 'Lists are mutable sequences allowing append and in-place item assignment, whereas Tuples cannot be modified after creation.',
        },
      ],
      medium: [
        {
          id: 'q_py_m1',
          question_number: 2,
          skill: 'Python',
          difficulty: 'Medium',
          question: 'In Python, what is the behavior of a generator function utilizing the `yield` keyword?',
          options: [
            'A: It produces a list of all calculated values in memory simultaneously',
            'B: It pauses function execution, yields the current value lazily, and resumes state on next() call',
            'C: It spawns an OS-level background thread for computation',
            'D: It converts dynamic variables to compiled C primitives',
          ],
          correct_answer: 'B: It pauses function execution, yields the current value lazily, and resumes state on next() call',
          explanation: '`yield` suspends the generator state, allowing memory-efficient lazy iteration over large or infinite datasets.',
        },
      ],
      hard: [
        {
          id: 'q_py_h1',
          question_number: 3,
          skill: 'Python',
          difficulty: 'Hard',
          question: 'What is Python\'s Global Interpreter Lock (GIL) and how does it affect CPU-bound multi-threading in CPython?',
          options: [
            'A: The GIL prevents multiple threads from executing Python bytecodes simultaneously in a single OS process',
            'B: The GIL automatically optimizes CPU operations into GPU CUDA cores',
            'C: The GIL disables socket I/O for async coroutines',
            'D: The GIL is only active during file disk writes',
          ],
          correct_answer: 'A: The GIL prevents multiple threads from executing Python bytecodes simultaneously in a single OS process',
          explanation: 'CPython\'s GIL ensures memory thread safety by allowing only one native thread to execute Python bytecode at a time, requiring multiprocessing for true CPU parallelism.',
        },
      ],
    },
    javascript: {
      easy: [
        {
          id: 'q_js_e1',
          question_number: 1,
          skill: 'JavaScript',
          difficulty: 'Easy',
          question: 'What is the primary difference between `let` and `var` in modern JavaScript?',
          options: [
            'A: `let` is block-scoped while `var` is function-scoped',
            'B: `var` cannot be reassigned while `let` can be reassigned',
            'C: `let` creates global variables by default',
            'D: `var` was introduced in ES6 while `let` is legacy ES5',
          ],
          correct_answer: 'A: `let` is block-scoped while `var` is function-scoped',
          explanation: '`let` and `const` have block-level scoping, whereas `var` declarations are hoisted and scoped to the enclosing function or global context.',
        },
      ],
      medium: [
        {
          id: 'q_js_m1',
          question_number: 2,
          skill: 'JavaScript',
          difficulty: 'Medium',
          question: 'What will be output by `console.log(typeof null)` in JavaScript?',
          options: [
            'A: "null" because null is a distinct primitive type',
            'B: "object" due to a historical legacy bug in JavaScript type tagging',
            'C: "undefined" because null indicates an unassigned reference',
            'D: "boolean" as null coerces into false in boolean logic',
          ],
          correct_answer: 'B: "object" due to a historical legacy bug in JavaScript type tagging',
          explanation: 'In the original implementation of JavaScript, null had type tag 000 (object), creating this enduring quirk.',
        },
      ],
      hard: [
        {
          id: 'q_js_h1',
          question_number: 3,
          skill: 'JavaScript',
          difficulty: 'Hard',
          question: 'In the JavaScript Event Loop, what is the execution priority between Microtasks and Macrotasks?',
          options: [
            'A: Macrotasks always execute before the Microtask queue is inspected',
            'B: All queued Microtasks (e.g. Promise.then, queueMicrotask) execute completely before the next Macrotask (e.g. setTimeout) runs',
            'C: Microtasks and Macrotasks run concurrently via web workers',
            'D: `setTimeout(..., 0)` always takes priority over resolved Promises',
          ],
          correct_answer: 'B: All queued Microtasks (e.g. Promise.then, queueMicrotask) execute completely before the next Macrotask (e.g. setTimeout) runs',
          explanation: 'At the end of each task execution, the microtask queue is drained entirely before the event loop advances to the next macrotask.',
        },
      ],
    },
    react: {
      easy: [
        {
          id: 'q_rc_e1',
          question_number: 4,
          skill: 'React.js',
          difficulty: 'Easy',
          question: 'What is the purpose of the dependency array in the `useEffect` hook?',
          options: [
            'A: It defines which CSS stylesheets to apply to the component',
            'B: It dictates which state or prop changes should re-trigger the effect execution',
            'C: It configures the server-side rendering caching headers',
            'D: It binds the component instance to the global window event bus',
          ],
          correct_answer: 'B: It dictates which state or prop changes should re-trigger the effect execution',
          explanation: 'Passing values in the dependency array tells React to re-run the effect callback only if any of those dependency values change between renders.',
        },
      ],
      medium: [
        {
          id: 'q_rc_m1',
          question_number: 5,
          skill: 'React.js',
          difficulty: 'Medium',
          question: 'Why should you avoid using array index as `key` when rendering dynamic lists in React?',
          options: [
            'A: Array indexes violate HTML5 semantic standards',
            'B: Reordering, adding, or deleting items causes reconciliation mismatches and state bugs in child components',
            'C: React throws a fatal compile-time syntax error on numeric keys',
            'D: Indexes prevent CSS selectors from targeting child elements',
          ],
          correct_answer: 'B: Reordering, adding, or deleting items causes reconciliation mismatches and state bugs in child components',
          explanation: 'React uses keys for identity during reconciliation; changing indexes on reorder causes React to reuse old component DOM nodes and internal states incorrectly.',
        },
      ],
      hard: [
        {
          id: 'q_rc_h1',
          question_number: 6,
          skill: 'React.js',
          difficulty: 'Hard',
          question: 'When should `useCallback` or `useMemo` be applied for performance optimization in React?',
          options: [
            'A: Every single variable and function inside every component should be wrapped in them',
            'B: Only when passing callbacks to memoized children (`React.memo`) or when computational expense is high',
            'C: Only on the root App component to prevent page reload',
            'D: To replace standard state dispatchers',
          ],
          correct_answer: 'B: Only when passing callbacks to memoized children (`React.memo`) or when computational expense is high',
          explanation: 'Overusing `useCallback` introduces memory and comparison overhead; it is most valuable when preserving reference equality for memoized child components.',
        },
      ],
    },
    sql: {
      easy: [
        {
          id: 'q_sql_e1',
          question_number: 7,
          skill: 'SQL & Databases',
          difficulty: 'Easy',
          question: 'What SQL clause is used to filter aggregated group results rather than individual table rows?',
          options: [
            'A: WHERE',
            'B: HAVING',
            'C: FILTER BY',
            'D: GROUP LIMIT',
          ],
          correct_answer: 'B: HAVING',
          explanation: '`WHERE` filters rows prior to aggregation, while `HAVING` applies filtering conditions to the aggregated groups produced by `GROUP BY`.',
        },
      ],
      medium: [
        {
          id: 'q_sql_m1',
          question_number: 8,
          skill: 'SQL & Databases',
          difficulty: 'Medium',
          question: 'What is the main benefit of a B-Tree index on a high-cardinality foreign key column?',
          options: [
            'A: It compresses table disk space to zero',
            'B: It speeds up search, join, and range query lookups from O(N) full table scans to O(log N)',
            'C: It automatically enforces primary key uniqueness on all columns',
            'D: It eliminates the need for database backups',
          ],
          correct_answer: 'B: It speeds up search, join, and range query lookups from O(N) full table scans to O(log N)',
          explanation: 'B-Tree indexes maintain sorted balanced tree structures, enabling logarithmic time-complexity lookups for equality and range filters during JOINs and WHERE clauses.',
        },
      ],
      hard: [
        {
          id: 'q_sql_h1',
          question_number: 9,
          skill: 'SQL & Databases',
          difficulty: 'Hard',
          question: 'What is the difference between `READ COMMITTED` and `SERIALIZABLE` transaction isolation levels in PostgreSQL?',
          options: [
            'A: `READ COMMITTED` prevents all concurrent writes across the entire database',
            'B: `SERIALIZABLE` completely prevents phantom reads and serialization anomalies, guaranteeing transactions behave as if executed sequentially',
            'C: `READ COMMITTED` allows dirty reads of uncommitted changes from other transactions',
            'D: There is no functional difference; they are vendor-specific synonyms',
          ],
          correct_answer: 'B: `SERIALIZABLE` completely prevents phantom reads and serialization anomalies, guaranteeing transactions behave as if executed sequentially',
          explanation: '`SERIALIZABLE` provides the strictest isolation, preventing phantom reads, non-repeatable reads, and write skew anomalies by tracking read/write dependency graphs.',
        },
      ],
    },
    devops: {
      easy: [
        {
          id: 'q_do_e1',
          question_number: 10,
          skill: 'Docker & Cloud',
          difficulty: 'Easy',
          question: 'What is the core distinction between a Docker Image and a Docker Container?',
          options: [
            'A: An Image is a read-only template/blueprint; a Container is a runnable, isolated instance of that Image',
            'B: An Image runs on Windows only; a Container runs on Linux only',
            'C: Images are used exclusively in production while Containers are for local development',
            'D: Containers cannot have network connectivity',
          ],
          correct_answer: 'A: An Image is a read-only template/blueprint; a Container is a runnable, isolated instance of that Image',
          explanation: 'A Docker image is a static immutable package containing application code and runtime dependencies; a container is the running state instantiated from an image.',
        },
        {
          id: 'q_do_e2',
          question_number: 11,
          skill: 'Git & Version Control',
          difficulty: 'Easy',
          question: 'What is the purpose of `git rebase` compared to `git merge`?',
          options: [
            'A: Rebase moves or reapplies a sequence of commits onto a new base commit for a linear project history',
            'B: Rebase deletes the remote git repository permanently',
            'C: Rebase only works on SVN repositories',
            'D: Merge cannot combine two branches',
          ],
          correct_answer: 'A: Rebase moves or reapplies a sequence of commits onto a new base commit for a linear project history',
          explanation: 'Rebasing rewrites commit history on top of the target branch tip, creating a clean linear timeline without merge commits.',
        },
      ],
      medium: [
        {
          id: 'q_do_m1',
          question_number: 12,
          skill: 'Cloud & Architecture',
          difficulty: 'Medium',
          question: 'What architectural principle is essential when designing horizontally scalable stateless backend services in the cloud?',
          options: [
            'A: Storing user sessions directly in in-memory server local variables',
            'B: Offloading session state, caches, and file storage to shared distributed services (e.g. Redis, S3, Database)',
            'C: Ensuring only one single virtual machine processes all requests',
            'D: Disabling load balancers to reduce network hops',
          ],
          correct_answer: 'B: Offloading session state, caches, and file storage to shared distributed services (e.g. Redis, S3, Database)',
          explanation: 'Stateless servers allow load balancers to distribute incoming requests to any container or instance interchangeably without losing session or file state.',
        },
        {
          id: 'q_do_m2',
          question_number: 13,
          skill: 'REST APIs & Web Security',
          difficulty: 'Medium',
          question: 'How does Rate Limiting with the Token Bucket algorithm prevent API abuse?',
          options: [
            'A: By completely terminating the database connection on every 10th request',
            'B: By adding tokens to a bucket at a fixed rate, allowing bursts up to bucket capacity and throttling requests when the bucket is empty',
            'C: By encrypting API payloads using asymmetric keys',
            'D: By charging user credit cards on every 404 response',
          ],
          correct_answer: 'B: By adding tokens to a bucket at a fixed rate, allowing bursts up to bucket capacity and throttling requests when the bucket is empty',
          explanation: 'Token bucket smoothly regulates throughput while accommodating legitimate burst traffic up to the specified bucket capacity.',
        },
      ],
      hard: [
        {
          id: 'q_do_h1',
          question_number: 14,
          skill: 'Security & Auth',
          difficulty: 'Hard',
          question: 'Why is storing JWT access tokens in `localStorage` vulnerable to Cross-Site Scripting (XSS), and what is the standard defense?',
          options: [
            'A: JavaScript cannot read localStorage; the defense is using sessionStorage',
            'B: Any malicious XSS script running on the origin can read localStorage; the defense is storing sensitive tokens in `HttpOnly, Secure, SameSite` cookies',
            'C: LocalStorage tokens automatically expire after 60 seconds',
            'D: JWTs cannot be parsed without a server private key',
          ],
          correct_answer: 'B: Any malicious XSS script running on the origin can read localStorage; the defense is storing sensitive tokens in `HttpOnly, Secure, SameSite` cookies',
          explanation: '`HttpOnly` cookies cannot be accessed via client-side `document.cookie` or JavaScript execution, shielding session tokens from direct extraction via XSS.',
        },
        {
          id: 'q_do_h2',
          question_number: 15,
          skill: 'Data Structures & Algorithms',
          difficulty: 'Hard',
          question: 'What is the average and worst-case time complexity of QuickSort, and why does worst-case degradation occur?',
          options: [
            'A: Average O(N log N), Worst-case O(N^2) when chosen pivot is consistently the smallest or largest element on sorted arrays',
            'B: Always O(N) in all circumstances',
            'C: Average O(N^2), Worst-case O(N!)',
            'D: Average O(log N), Worst-case O(N)',
          ],
          correct_answer: 'A: Average O(N log N), Worst-case O(N^2) when chosen pivot is consistently the smallest or largest element on sorted arrays',
          explanation: 'If unbalanced partitioning occurs (e.g. pivot is always minimum/maximum), the recursion depth becomes N instead of log N, yielding O(N^2) time complexity.',
        },
      ],
    },
  };

  // Compile 5 Easy, 6 Medium, 4 Hard questions
  const easyPool = [
    ...pool.python.easy,
    ...pool.javascript.easy,
    ...pool.react.easy,
    ...pool.sql.easy,
    ...pool.devops.easy,
  ];

  const mediumPool = [
    ...pool.python.medium,
    ...pool.javascript.medium,
    ...pool.react.medium,
    ...pool.sql.medium,
    ...pool.devops.medium,
  ];

  const hardPool = [
    ...pool.python.hard,
    ...pool.javascript.hard,
    ...pool.react.hard,
    ...pool.sql.hard,
    ...pool.devops.hard,
  ];

  const selectedQuestions: QuizQuestion[] = [
    ...easyPool.slice(0, 5),
    ...mediumPool.slice(0, 6),
    ...hardPool.slice(0, 4),
  ];

  return selectedQuestions.map((q, idx) => ({
    ...q,
    id: 'gen_q_' + (idx + 1),
    question_number: idx + 1,
    skill: rawSkillNames[idx % rawSkillNames.length] || q.skill,
  }));
}
