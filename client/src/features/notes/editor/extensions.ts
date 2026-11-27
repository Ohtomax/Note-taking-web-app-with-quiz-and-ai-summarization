import StarterKit from '@tiptap/starter-kit';
import { TaskList, TaskItem, OrderedList } from '@tiptap/extension-list';

const NumericOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      start: {
        default: 1,
        parseHTML: (element) => {
          const start = Number(element.getAttribute('start') ?? 1);
          return Number.isInteger(start) && start > 0 && start <= 10000 ? start : 1;
        },
      },
    };
  },
});

export const noteExtensions = () => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: false,
    orderedList: false,
  }),
  NumericOrderedList,
  TaskList,
  TaskItem.configure({ nested: true }),
];
