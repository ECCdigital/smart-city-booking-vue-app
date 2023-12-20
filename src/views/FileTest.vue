<template>
  <div>
    <FileList tenant="diz" />
  </div>
</template>

<script>
import FileList from "@/components/Files/FileList";

export default {
  name: "FileTest",
  components: {
    FileList,
  },
  data() {
    return {
      url: "https://someurl.com/a/file.txt",
    };
  },
  mounted() {},
};
</script>

<style scoped></style>
