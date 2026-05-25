# example tests. To run these tests, uncomment this file along with the example
# resource in temp_init/recipe_stack.py
# def test_sqs_queue_created():
#     app = core.App()
#     stack = RecipeStack(app, "temp-init")
#     template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
