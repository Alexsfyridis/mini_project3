"use strict";

/**
 * Assignment class
 *  - assignmentName: string
 *  - status: string
 *  - _grade: number | null   (private-style, see rubric note about "_" vars)
 */
class Assignment {
  constructor(assignmentName) {
    this.assignmentName = assignmentName;
    this.status = "not assigned";
    // “Private” grade, only changed via setGrade()
    this._grade = null;
    this.isSubmitted = false;
  }

  // Sets numeric grade and updates status to 'pass' / 'fail'
  setGrade(grade) {
    this._grade = grade;
    this.status = grade > 50 ? "pass" : "fail"; // strictly over 50
  }
}

/**
 * Observer pattern: prints notifications whenever a student's
 * assignment status changes.
 */
class Observer {
  notify(student, assignment) {
    const studentName = student.fullName;
    const assignmentName = assignment.assignmentName;
    const status = assignment.status;

    let message;

    switch (status) {
      case "released":
        message = `Observer \u2192 ${studentName}, ${assignmentName} has been released.`;
        break;
      case "working":
        message = `Observer \u2192 ${studentName} is working on ${assignmentName}.`;
        break;
      case "submitted":
        message = `Observer \u2192 ${studentName} has submitted ${assignmentName}.`;
        break;
      case "pass":
        message = `Observer \u2192 ${studentName} has passed ${assignmentName}`;
        break;
      case "fail":
        message = `Observer \u2192 ${studentName} has failed ${assignmentName}`;
        break;
      case "final reminder":
        message = `Observer \u2192 Reminder for ${studentName}: ${assignmentName} is due soon.`;
        break;
      default:
        message = `Observer \u2192 ${studentName}, ${assignmentName} status is ${status}.`;
        break;
    }

    console.log(message);
  }
}

/**
 * Student class
 *  - fullName: string
 *  - email: string
 *  - assignmentStatuses: Assignment[]
 *  - overallGrade: number | null
 */
class Student {
  constructor(fullName, email, observer) {
    this.fullName = fullName;
    this.email = email;
    this.assignmentStatuses = [];
    this.overallGrade = null;
    this._observer = observer;
  }

  setFullName(fullName) {
    this.fullName = fullName;
  }

  setEmail(email) {
    this.email = email;
  }

  // Helper to find an assignment by name
  _findAssignment(assignmentName) {
    return this.assignmentStatuses.find(
      (a) => a.assignmentName === assignmentName
    );
  }

  // Helper to notify observer if present
  _notifyObserver(assignment) {
    if (this._observer && typeof this._observer.notify === "function") {
      this._observer.notify(this, assignment);
    }
  }

  /**
   * updateAssignmentStatus(name, grade?)
   *  - if assignment doesn't exist: add it with status 'released'
   *  - if grade is provided: call setGrade on the assignment
   *  - always notify observer after update
   */
  updateAssignmentStatus(assignmentName, grade) {
    let assignment = this._findAssignment(assignmentName);

    if (!assignment) {
      assignment = new Assignment(assignmentName);
      assignment.status = "released";
      this.assignmentStatuses.push(assignment);
    }

    if (typeof grade === "number") {
      assignment.setGrade(grade);
    }

    this._notifyObserver(assignment);
  }

  /**
   * getAssignmentStatus(name)
   *  - 'Pass', 'Fail', "Hasn't been assigned", or the raw status string
   */
  getAssignmentStatus(assignmentName) {
    const assignment = this._findAssignment(assignmentName);

    if (!assignment) {
      return "Hasn't been assigned";
    }

    if (assignment.status === "pass") return "Pass";
    if (assignment.status === "fail") return "Fail";

    return assignment.status;
  }

  /**
   * startWorking(name)
   *  - set status to 'working'
   *  - wait 500ms asynchronously, then call submitAssignment
   *    (unless it's already submitted/graded or reminded)
   */
  startWorking(assignmentName) {
    let assignment = this._findAssignment(assignmentName);

    if (!assignment) {
      assignment = new Assignment(assignmentName);
      this.assignmentStatuses.push(assignment);
    }

    assignment.status = "working";
    this._notifyObserver(assignment);

    setTimeout(() => {
      if (
        !assignment.isSubmitted &&
        assignment.status !== "pass" &&
        assignment.status !== "fail"
      ) {
        this.submitAssignment(assignmentName);
      }
    }, 500);
  }

  /**
   * submitAssignment(name)
   *  - mark status 'submitted'
   *  - after 500ms asynchronously, assign random grade 0–100
   *    and update status to pass/fail via setGrade
   */
  submitAssignment(assignmentName) {
    let assignment = this._findAssignment(assignmentName);

    if (!assignment) {
      assignment = new Assignment(assignmentName);
      this.assignmentStatuses.push(assignment);
    }

    if (assignment.isSubmitted) {
      return; // avoid double-submit (e.g., reminder + timer)
    }

    assignment.isSubmitted = true;
    assignment.status = "submitted";
    this._notifyObserver(assignment);

    setTimeout(() => {
      const grade = Math.floor(Math.random() * 101); // 0–100 inclusive
      assignment.setGrade(grade);
      this.getGrade(); // refresh overallGrade
      this._notifyObserver(assignment);
    }, 500);
  }

  /**
   * getGrade()
   *  - returns the equally weighted average of all graded assignments
   *  - also stores the result in overallGrade
   */
  getGrade() {
    const gradedAssignments = this.assignmentStatuses.filter(
      (a) => typeof a._grade === "number"
    );

    if (gradedAssignments.length === 0) {
      this.overallGrade = null;
      return null;
    }

    const total = gradedAssignments.reduce((sum, a) => sum + a._grade, 0);
    const average = total / gradedAssignments.length;

    this.overallGrade = average;
    return average;
  }
}

/**
 * ClassList
 *  - maintains array of Student objects
 *  - methods: addStudent, removeStudent, findStudentByName,
 *             findOutstandingAssignments, releaseAssignmentsParallel,
 *             sendReminder
 */
class ClassList {
  constructor(observer) {
    this.students = [];
    this._observer = observer;
  }

  // Prints the “X has been added to the classlist.” message
  addStudent(student) {
    this.students.push(student);
    console.log(`${student.fullName} has been added to the classlist.`);
  }

  removeStudent(student) {
    this.students = this.students.filter((s) => s !== student);
  }

  findStudentByName(fullName) {
    return this.students.find((s) => s.fullName === fullName);
  }

  /**
   * findOutstandingAssignments(assignmentName)
   *  - normally: list of student names who have that assignment
   *    but have NOT submitted it yet (i.e., not submitted/pass/fail)
   *  - if NO student has that assignment submitted, return the list
   *    of student names who have *any* assignment that is released
   *    but not yet submitted.
   */
  findOutstandingAssignments(assignmentName) {
    const outstandingForName = [];
    let anySubmittedForName = false;

    this.students.forEach((student) => {
      const assignment = student.assignmentStatuses.find(
        (a) => a.assignmentName === assignmentName
      );

      if (assignment) {
        if (
          assignment.status === "submitted" ||
          assignment.status === "pass" ||
          assignment.status === "fail"
        ) {
          anySubmittedForName = true;
        }

        if (
          assignment.status !== "submitted" &&
          assignment.status !== "pass" &&
          assignment.status !== "fail"
        ) {
          outstandingForName.push(student.fullName);
        }
      }
    });

    if (anySubmittedForName) {
      return outstandingForName;
    }

    // Fallback case: no one has submitted this assignment yet.
    const fallback = [];
    this.students.forEach((student) => {
      const hasOutstanding = student.assignmentStatuses.some(
        (a) => a.status === "released" || a.status === "working"
      );
      if (hasOutstanding) {
        fallback.push(student.fullName);
      }
    });

    return fallback;
  }

  /**
   * releaseAssignmentsParallel(assignmentNames)
   *  - releases each assignment to all students concurrently using Promise.all
   */
  releaseAssignmentsParallel(assignmentNames) {
    const promises = assignmentNames.map(
      (assignmentName) =>
        new Promise((resolve) => {
          // small async delay so it’s truly asynchronous
          setTimeout(() => {
            this.students.forEach((student) => {
              student.updateAssignmentStatus(assignmentName);
            });
            resolve();
          }, 0);
        })
    );

    return Promise.all(promises);
  }

  /**
   * sendReminder(assignmentName)
   *  - for all students who have NOT completed the assignment:
   *      * set status to "final reminder"
   *      * notify via Observer
   *      * force the assignment to be submitted
   */
  sendReminder(assignmentName) {
    this.students.forEach((student) => {
      const assignment = student.assignmentStatuses.find(
        (a) => a.assignmentName === assignmentName
      );

      if (!assignment) return;

      // already finished: no reminder
      if (assignment.status === "pass" || assignment.status === "fail") {
        return;
      }

      assignment.status = "final reminder";

      if (this._observer && typeof this._observer.notify === "function") {
        this._observer.notify(student, assignment);
      }

      // submit even if still working or hasn’t started
      student.submitAssignment(assignmentName);
    });
  }
}

// Export for Node / autograder
if (typeof module !== "undefined") {
  module.exports = {
    Assignment,
    Observer,
    Student,
    ClassList,
  };
}
